"use strict"

const hypercache = require("hypercache")

const Peer = require("./zeronet-peer")

const each = require("async/each")

const debug = require("debug")
const log = debug("zeronet:peer-pool")
log.error = debug("zeronet:peer-pool:error")

module.exports = function PeerPool() {
  const self = this

  const cache = new hypercache(null, {
    name: "peers",
    keys: ["addr", "id", "multiaddr"],
    sets: ["zites"],
    manual: true
  })

  let peers = []

  function isInList(peerLike) {
    return cache.search(peerLike.toString())[0]
  }

  function update() {
    log("update cache")
    cache.update(peers)
  }

  function add(peerLike, zite, cb, lazy) {
    if (isInList(peerLike)) {
      const peer = isInList(peerLike)
      peer.setZite(zite)
      return cb(null, peer)
    }
    Peer.fromAddr(peerLike, (err, peer) => {
      if (err) return cb(err)

      if (peer.multiaddr.endsWith("/0")) //no port, ignore
        return cb("ignore " + peer.multiaddr)

      if (isInList(peerLike)) {
        log.error("race for %s: already added", peerLike)
        return add(peerLike, zite, cb) //will add the zite and call cb
      }

      peers.push(peer)
      peer.setZite(zite)

      log("added", peer.multiaddr)
      if (!lazy) update()
      return cb()
    })
  }

  function addMany(list, zite, cb) {
    if (!Array.isArray(list)) list = [list]
    log("adding", list.length)
    each(list, (addr, next) => {
      add(addr, zite, err => {
        if (err) log.error(err)
        return next()
      }, true)
    }, () => {
      update()
      if (cb) cb()
    })
  }

  function getAll() {
    return cache.getAll()
  }

  function getZite(zite) {
    return cache.getSet("zites", zite)
  }

  update()

  self.add = add
  self.addMany = addMany
  self.getAll = getAll
  self.getZite = getZite
  self.cache = cache
}
