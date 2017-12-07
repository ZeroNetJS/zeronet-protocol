'use strict'

const multiaddr = require('multiaddr')
const TCP = require('libp2p-tcp')
const tcp = new TCP()

module.exports = cb => {
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
