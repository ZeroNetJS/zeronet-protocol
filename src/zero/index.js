'use strict'

const debug = require('debug')
const log = debug('zeronet:protocol:zero')

const validate = require('./verify')
const PeerRequest = require('peer-request')
const handler = require('./peer-request-handler')

const HandshakeClient = require('./handshake/client')

const Crypto = require('zeronet-crypto').protocol

function ZProtocol (opt, zeronet) {
  if (!opt) opt = {}
  log('create zero protocol', opt)

  const self = this
  const commands = self.commands = {}
  const handlers = self.handlers = {}

  self.attach = client => {
    client.cmd = {}
    Object.keys(commands).forEach(cmd => {
      log('attaching %s to %s', cmd, client.addr)
      const h = handler(cmd, commands[cmd], client, handlers[cmd])
      client.handlers[cmd] = h.recv
      client.cmd[cmd] = h.send
    })
  }

  self.upgradeConn = opt =>
    (conn, cb) => {
      log('upgrading conn', opt)
      if (!cb) cb = () => {}
      const c = conn.client = new HandshakeClient(conn, opt, zeronet, self)
      c.conn = conn
      c.upgrade((err, client, upgrade) => {
        if (err) return cb(err)
        if (upgrade) {
          return cb(null, null, upgrade)
        } else {
          c.upgraded = client
          log('finished upgrade', opt)
          return cb(null, client)
        }
      })
    }

  self.handle = self.handleZN = (name, def, defret, cb) => {
    if (commands[name]) throw new Error(name + ' is already handled')
    log('Handling', name)
    commands[name] = new PeerRequest(name, def, defret, validate)
    handlers[name] = cb
  }

  if (opt.crypto) {
    Crypto(self)
    if (!Array.isArray(opt.crypto)) opt.crypto = [opt.crypto]
    opt.crypto.map(c => c(self, zeronet, opt.id))
  }
}

module.exports = ZProtocol
