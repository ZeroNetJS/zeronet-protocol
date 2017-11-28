'use strict'

// TODO: REWRITE THIS MADNESS!!

const pull = require('pull-stream')

// bridge

const Queue2 = require('data-queue')

// duplex bridge stream

module.exports = function DuplexBridge (dup) {
  const srcQueue = Queue2()
  const sinkQueue = Queue2()
  const q = {
    _pre: Queue2(),
    _post: Queue2(),
    pre: Queue2(),
    post: Queue2()
  }

  let u = 'pre'

  function gloop () {
    srcQueue.get((e, d) => {
      if (e) return q.pre.error(e) || q.post.error(e)
      q[u].append(d)
      gloop()
    })
  }
  gloop()

  /* let srun = true

  function sinkloop() {
    q["_" + u].get((e, r) => {
      if (e) return sinkQueue.error(e, srun = false)
      if (sinkQueue.append(r)) {
        q._pre.error(sinkQueue.append())
        q._post.error(sinkQueue.append())
        return (srun = false)
      }
      return sinkloop()
    })
  }
  sinkloop() */

  const cat = {
    source: function (end, cb) {
      if (end) {
        sinkQueue.error(end)
        return cb(end)
      }
      sinkQueue.get(cb)
    },
    sink: function (read) {
      read(null, function next (end, data) {
        if (end) {
          srcQueue.error(end)
          return
        }
        srcQueue.append(data)
        read(null, next)
      })
    }
  }

  pull(
    dup.source,
    cat.sink
  )
  pull(
    cat.source,
    dup.sink
  )

  const preStream = {
    source: function (end, cb) { // this outputs the data we recieve from "dup"
      if (end) { // pre sink has ended
        return cb(end)
      }
      q.pre.get(cb)
    },
    sink: function (read) {
      read(null, function next (end, data) { // this queues data to be sent over "dup"
        if (end) { // pre src has ended
          return
        }
        // if (q._pre.append(data)) return read(q._pre.append())
        if (sinkQueue.append(data)) return read(sinkQueue.append())
        read(null, next)
      })
    },
    restore: d => {
      // change the queue to append
      u = 'post'

      if (Array.isArray(d)) {
        d.forEach(q.post.prepend) // prepend data
      }

      // move everything from pre queue to post queue
      q.pre.error(true)
      // q._pre.error(true)
      // q._post.error(true)

      function loop () {
        q.pre.get((e, r) => {
          if (e) return
          q.post.append(r)
          loop()
        })
      }
      loop() // it's in sync so it blocks

      // if (!srun) sinkloop()

      return postStream
    }
  }

  const postStream = {
    source: function (end, cb) { // this outputs the data we recive from "dup"
      if (end) { // pre sink has ended
        return cb(end)
      }
      q.post.get(cb)
    },
    sink: function (read) {
      read(null, function next (end, data) { // this queues data to be sent over "dup"
        if (end) { // pre src has ended
          return
        }
        // if (q._post.append(data)) return read(q._post.append())
        if (sinkQueue.append(data)) return read(sinkQueue.append())
        read(null, next)
      })
    }
  }

  return preStream
}

module.exports.through = function ThroughBridge () {
  const out = Queue2()
  const self = function (read) {
    return function (end, cb) {
      if (end) out.error(end)
      return read(end, function (end, data) {
        if (!end) out.append(data)
        else out.error(end)
        cb(end, data)
      })
    }
  }
  self.source = function (end, cb) {
    if (end) {
      out.error(end)
      return cb(end)
    }
    out.get(cb)
  }

  return self
}
