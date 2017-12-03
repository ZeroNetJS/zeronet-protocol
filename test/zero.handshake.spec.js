/* eslint-env mocha */

'use strict'

const {Duplex} = require('./util')
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
    // console.log(c)
    c.cmd.ping({body: 'Pong!'}, cb)
  })
})
