'use strict'

const _Duplex = require('pull-pair/duplex')
const Connection = require('interface-connection').Connection
const multiaddr = require('multiaddr')

const Duplex = () => {
  const d = _Duplex()
  let isc = 1 // is client
  return d.map(d => {
    return new Connection(d, {
      getObservedAddrs: isc-- ? (cb) => cb(null, [multiaddr('/ip4/127.0.0.1/tcp/15544')]) : (cb) => cb(null, [multiaddr('/ip4/127.0.0.1/tcp/36778')])
    })
  })
}

module.exports = {
  Duplex
}
