/* eslint-env mocha */

'use strict'

const {Duplex, TCPDuplex, skipbrowser} = require('./util')
const Protocol = require('../src').Zero

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const protocol = new Protocol({}, {swarm: {}})

protocol.handle('ping', {}, {body: [
  b => Boolean(b === 'Pong!')
]}, (data, cb) => cb(null, {body: 'Pong!'}))

const doServer = protocol.upgradeConn({isServer: true})
const doClient = protocol.upgradeConn({isServer: false})

describe('zero protocol', () => {
  describe('handshake', () => {
    it('can send pings', cb => {
      const [client, server] = Duplex()
      doServer(server, err => expect(err).to.not.exist())
      doClient(client, (err, c) => {
        if (err) return cb(err)
        c.cmd.ping({body: 'Pong!'}, cb)
      })
    })

    skipbrowser(it)('can send pings via tcp', cb => {
      TCPDuplex((err, client, server) => {
        if (err) return cb(err)
        doServer(server, err => expect(err).to.not.exist())
        doClient(client, (err, c) => {
          if (err) return cb(err)
          c.cmd.ping({body: 'Pong!'}, cb)
        })
      })
    })
  })
})
