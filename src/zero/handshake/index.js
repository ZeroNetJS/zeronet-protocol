'use strict'

const definition = { // Definitions are symmetric
  crypt: [a => a === null, 'string'],
  crypt_supported: Array.isArray,
  fileserver_port: 'number',
  peer_id: 'string',
  port_opened: 'boolean',
  protocol: 'string',
  rev: 'number',
  target_ip: 'string',
  version: 'string',
  upgradeLibp2p: [a => a === undefined, a => Boolean(a.matches(/^[A-Za-z0-9]+$/))]
}
const validate = require('../verify')
const PeerRequest = require('peer-request')

function genHandshakeData (protocol, client, zeronet) {
  let adv = {}
  if (zeronet.swarm.zero) {
    adv = zeronet.swarm.zero.advertise
  }
  let d = {
    crypt: null,
    crypt_supported: protocol.crypto ? protocol.crypto.supported() : [],
    fileserver_port: adv.port || 0,
    protocol: 'v2',
    port_opened: adv.port_open || false,
    rev: zeronet.rev,
    version: zeronet.version,
    own: true // this marks our own handshake. required for linking
  }
  if (client.isTor) {
    d.onion = 0 // TODO: add tor
  } else {
    d.peer_id = zeronet.peer_id
    d.target_ip = adv.ip || '0.0.0.0'
    if (zeronet.swarm.lp2p && zeronet.swarm.lp2p.up) d.upgradeLibp2p = zeronet.swarm.lp2p.idB58
  }
  return d
}

function Handshake (data) {
  const self = this

  for (var p in data) {
    self[p] = data[p]
  }

  function addCMD (name, fnc, needOwn) {
    self[name] = function () {
      if (!self.linked && needOwn) throw new Error('No handshake linked')
      if (self.linked && needOwn && !self.own) return self.linked[name].apply(self.linked, arguments)
      return fnc.apply(self.linked, arguments)
    }
  }

  self.link = (h2, r) => {
    self.linked = h2
    if (!r) h2.link(self, true)
    delete self.link
  }

  self.toJSON = () => {
    const r = {}
    for (var p in module.exports.def) {
      r[p] = self[p]
    }
    return r
  }

  addCMD('commonCrypto', () => self.crypt_supported.filter(c => self.linked.crypt_supported.indexOf(c) !== -1)[0], true)
  addCMD('canUpgrade', () => self.upgradeLibp2p && self.linked.upgradeLibp2p ? self.linked.upgradeLibp2p : false, true)
}

module.exports = Handshake
module.exports.create = (protocol, client, zeronet) => new Handshake(genHandshakeData(protocol, client, zeronet))
module.exports.strictDefinition = definition
module.exports.peerRequest = new PeerRequest('handshake', definition, definition, validate)
