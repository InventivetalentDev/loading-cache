import * as NodeCache from "node-cache";
import { Key, Options, Stats, ValueSetItem } from "node-cache";
export declare class BaseCache<T> {
    readonly cache: NodeCache;
    constructor(options: Options);
    /**
     * get a cached key and change the stats
     *
     * @param key cache key
     * @returns The value stored in the key
     */
    protected get(key: Key): T | undefined;
    /**
     * get multiple cached keys at once and change the stats
     *
     * @param keys an array of keys
     * @returns an object containing the values stored in the matching keys
     */
    protected mget(keys: Key[]): {
        [key: string]: T;
    };
    /**
     * set a cached key and change the stats
     *
     * @param key cache key
     * @param value A element to cache. If the option `option.forceString` is `true` the module trys to translate
     * it to a serialized JSON
     * @param ttl The time to live in seconds.
     */
    set(key: Key, value: T, ttl?: number | string): boolean;
    /**
     * set multiple cached keys at once and change the stats
     *
     * @param keyValueSet an array of object which includes key,value and ttl
     */
    mset(keyValueSet: ValueSetItem<T>[]): boolean;
    /**
     * remove keys
     * @param keys cache key to delete or a array of cache keys
     * @param cb Callback function
     * @returns Number of deleted keys
     */
    del(keys: Key | Key[]): number;
    /**
     * get a cached key and remove it from the cache.
     * Equivalent to calling `get(key)` + `del(key)`.
     * Useful for implementing `single use` mechanism such as OTP, where once a value is read it will become obsolete.
     *
     * @param key cache key
     * @returns The value stored in the key
     */
    take(key: Key): T | undefined;
    /**
     * reset or redefine the ttl of a key. If `ttl` is not passed or set to 0 it's similar to `.del()`
     */
    ttl(key: Key, ttl?: number): boolean;
    getTtl(key: Key): number | undefined;
    /**
     * list all keys within this cache
     * @returns An array of all keys
     */
    keys(): string[];
    /**
     * get the stats
     *
     * @returns Stats data
     */
    getStats(): Stats;
    /**
     * Check if a key is cached
     * @param key cache key to check
     * @returns Boolean indicating if the key is cached or not
     */
    has(key: Key): boolean;
    /**
     * flush the whole data and reset the stats
     */
    flushAll(): void;
    /**
     * This will clear the interval timeout which is set on checkperiod option.
     */
    close(): void;
    /**
     * flush the stats and reset all counters to 0
     */
    flushStats(): void;
}
