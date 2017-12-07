'use strict'

const _Duplex = require('pull-pair/duplex')
const Connection = require('interface-connection').Connection
const multiaddr = require('multiaddr')
const pull = require('pull-stream')
const assert = require('assert')
const TCP = require('libp2p-tcp')
const tcp = new TCP()

const Duplex = () => {
  const d = _Duplex()
  let isc = 1 // is client
  return d.map(d => {
    return new Connection(d, {
      getObservedAddrs: isc-- ? (cb) => cb(null, [multiaddr('/ip4/127.0.0.1/tcp/15544')]) : (cb) => cb(null, [multiaddr('/ip4/127.0.0.1/tcp/36778')])
    })
  })
}

const TCPDuplex = cb => {
  const server = tcp.createListener()
  server.listen(multiaddr('/ip4/127.0.0.1/tcp/0'))
  server.once('listening', () => {
    server.getAddrs((err, addr) => {
      if (err) return cb(err)
      const client = tcp.dial(addr[0])
      server.on('connection', sclient => cb(null, client, sclient))
    })
  })
}

module.exports = {
  Duplex,
  TCPDuplex,
  pullCompare: (v, cb) => pull.collect((err, res) => {
    if (cb) {
      if (err) return cb(err)
    } else {
      if (err) throw err
    }
    assert.deepEqual(v, res)
    if (cb) cb()
  })
}
