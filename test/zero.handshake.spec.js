/* eslint-env mocha */

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
const Protocol = require('../src').Zero

const protocol = new Protocol({}, {swarm: {}})

protocol.handle('ping', {}, {body: [
  b => Boolean(b === 'Pong!')
]}, (data, cb) => cb(null, {body: 'Pong!'}))

const doServer = protocol.upgradeConn({isServer: true})
const doClient = protocol.upgradeConn({isServer: false})

it('can send pings', cb => {
  const [client, server] = Duplex()
  doServer(server, () => {})
  doClient(client, (err, c) => {
    if (err) return cb(err)
    c.cmd.ping({body: 'Pong!'}, cb)
  })
})
