'use strict'

function PeerRequestHandler (name, req, client, handler) {
  const self = this

  function recv (data, cb) {
    req.handleRequest(cb, data, handler)
  }

  function send (data, cb) {
    let cleanData = {}
    for (var p in req.defOut) {
      cleanData[p] = data[p]
    }
    req.sendRequest(client.request.bind(client, name), data, cb)
  }

  self.send = (data, cb) => send(data, cb)
  self.recv = (data, cb) => recv(data, cb)
}

module.exports = (...args) => new PeerRequestHandler(...args)
