const NodeCache = require('node-cache');

// Cache with 2 hour TTL (7200 seconds)
const cache = new NodeCache({ stdTTL: 7200, checkperiod: 300 });

module.exports = {
  get: (key) => cache.get(key),
  set: (key, value, ttl = 7200) => cache.set(key, value, ttl),
  del: (key) => cache.del(key),
  flush: () => cache.flushAll(),
  stats: () => cache.getStats(),
};
