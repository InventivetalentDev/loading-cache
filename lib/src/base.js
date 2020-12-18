"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCache = void 0;
const NodeCache = require("node-cache");
class BaseCache {
    constructor(options) {
        this.cache = new NodeCache(options);
    }
    /**
     * get a cached key and change the stats
     *
     * @param key cache key
     * @returns The value stored in the key
     */
    get(key) {
        return this.cache.get(key);
    }
    /**
     * get multiple cached keys at once and change the stats
     *
     * @param keys an array of keys
     * @returns an object containing the values stored in the matching keys
     */
    mget(keys) {
        return this.cache.mget(keys);
    }
    /**
     * set a cached key and change the stats
     *
     * @param key cache key
     * @param value A element to cache. If the option `option.forceString` is `true` the module trys to translate
     * it to a serialized JSON
     * @param ttl The time to live in seconds.
     */
    set(key, value, ttl = null) {
        return this.cache.set(key, value, ttl);
    }
    /**
     * set multiple cached keys at once and change the stats
     *
     * @param keyValueSet an array of object which includes key,value and ttl
     */
    mset(keyValueSet) {
        return this.cache.mset(keyValueSet);
    }
    /**
     * remove keys
     * @param keys cache key to delete or a array of cache keys
     * @param cb Callback function
     * @returns Number of deleted keys
     */
    del(keys) {
        return this.cache.del(keys);
    }
    /**
     * get a cached key and remove it from the cache.
     * Equivalent to calling `get(key)` + `del(key)`.
     * Useful for implementing `single use` mechanism such as OTP, where once a value is read it will become obsolete.
     *
     * @param key cache key
     * @returns The value stored in the key
     */
    take(key) {
        return this.cache.take(key);
    }
    /**
     * reset or redefine the ttl of a key. If `ttl` is not passed or set to 0 it's similar to `.del()`
     */
    ttl(key, ttl = null) {
        return this.cache.ttl(key, ttl);
    }
    getTtl(key) {
        return this.cache.getTtl(key);
    }
    /**
     * list all keys within this cache
     * @returns An array of all keys
     */
    keys() {
        return this.cache.keys();
    }
    /**
     * get the stats
     *
     * @returns Stats data
     */
    getStats() {
        return this.cache.getStats();
    }
    /**
     * Check if a key is cached
     * @param key cache key to check
     * @returns Boolean indicating if the key is cached or not
     */
    has(key) {
        return this.cache.has(key);
    }
    /**
     * flush the whole data and reset the stats
     */
    flushAll() {
        return this.cache.flushAll();
    }
    /**
     * This will clear the interval timeout which is set on checkperiod option.
     */
    close() {
        return this.cache.close();
    }
    /**
     * flush the stats and reset all counters to 0
     */
    flushStats() {
        return this.cache.flushStats();
    }
}
exports.BaseCache = BaseCache;
//# sourceMappingURL=base.js.map