/* eslint-env mocha */

'use strict'

const {/*Duplex,*/ TCPDuplex} = require('./util')
const Protocol = require('../src').Zero

const protocol = new Protocol({}, {swarm: {}})

protocol.handle('ping', {}, {body: [
  b => Boolean(b === 'Pong!')
]}, (data, cb) => cb(null, {body: 'Pong!'}))

const doServer = protocol.upgradeConn({isServer: true})
const doClient = protocol.upgradeConn({isServer: false})

/* it('can send pings', cb => { TODO: fix? sync stuff
  const [client, server] = Duplex()
  doServer(server, console.log)
  doClient(client, (err, c) => {
    if (err) return cb(err)
    console.log(c)
    c.cmd.ping({body: 'Pong!'}, cb)
  })
}) */


it('can send pings via tcp', cb => {
  TCPDuplex((err, client, server) => {
    if (err) return cb(err)
    doServer(server, console.log)
    doClient(client, (err, c) => {
      if (err) return cb(err)
      console.log(c)
      c.cmd.ping({body: 'Pong!'}, cb)
    })
  })
})
