'use strict'

const Client = require('zeronet-client')
const Handshake = require('.')
const WrapperStream = require('../stream/bridge')
const handler = require('../peer-request-handler')
const EE = require('events').EventEmitter
const once = require('once')
const bl = require('bl')
const debug = require('debug')
const log = debug('zeronet:protocol:zero:handshake')
const Connection = require('interface-connection').Connection

class HandshakeClient extends EE {
  constructor (conn, opt, zeronet, protocol) {
    super()

    this.clientHandlers = {}
    this.protocol = protocol
    this.zeronet = zeronet
    this.stream = WrapperStream(conn)
    this.conn = conn

    // Client
    this.client = Client(new Connection(this.stream, this.conn), this.clientHandlers, opt.isServer)
    this.isServer = this.client.isServer

    // Handlers
    this.handlers = {
      handshake: handler('handshake', Handshake.peerRequest, this.client, this.gotHandshake.bind(this))
    }
    this.clientHandlers.handshake = this.handlers.handshake.recv

    // Handshake
    this.handshake = {
      local: Handshake.create(protocol, this.client, zeronet),
      remote: null
    }
  }
  upgrade (cb) {
    cb = once(cb)
    const shake = this.isServer ? this.waitForHandshake.bind(this) : this.requestHandshake.bind(this)
    shake((err, handshake) => {
      if (err) return cb(err)
      this.client.disconnect()
      const next = conn => {
        const client = Client(conn, {}, this.isServer)
        this.protocol.attach(client)
        client.handshake = this.handshake
        client.crypto = this.protocol.crypto && handshake.commonCrypto() ? handshake.commonCrypto() : false
        cb(null, client)
      }

      if (handshake.getLibp2p() && handshake.getLibp2p().length) {
        cb(null, null, handshake.getLibp2p()) // trigger upgrade
      } else {
        if (this.protocol.crypto && handshake.commonCrypto()) {
          this.getRaw((err, conn) => {
            if (err) return cb(err)
            this.protocol.crypto.wrap(handshake.commonCrypto(), conn, {isServer: this.isServer}, (err, conn) => {
              if (err) return cb(err)
              else next(conn)
            })
          })
        } else {
          this.getRaw((err, conn) => err ? cb(err) : next(conn))
        }
      }
    })
  }
  gotHandshake (data, cb) {
    const h = new Handshake(data)
    if (cb) cb(null, this.handshake.local)
    h.link(this.handshake.local)
    this.handshake.remote = h
    this.emit('gotHandshake')
  }
  waitForHandshake (cb) {
    if (this.handshake.remote) return cb(null, this.handshake.remote)
    cb = once(cb)
    setTimeout(() => cb(new Error('Timeout')), 1000)
    this.once('gotHandshake', this.waitForHandshake.bind(this, cb))
  }
  requestHandshake (cb) {
    cb = once(cb)
    setTimeout(() => cb(new Error('Timeout')), 1000)
    this.handlers.handshake.send(this.handshake.local, (err, data) => {
      if (err) return cb(err)
      this.gotHandshake(data)
      cb(null, this.handshake.remote)
    })
  }
  getRaw (cb) {
    this.client.unpack.getChunks().pipe(bl((err, data) => {
      log('[%s/HANDSHAKE]: appending leftover bytes', this.client.addr, data.length)
      if (err) return cb(err)
      cb(null, new Connection(this.stream.restore([data]), this.conn))
    }))
  }
}

module.exports = HandshakeClient
