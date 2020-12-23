import { MappingFunction } from "../loaders";
import { ICacheBase } from "./ICacheBase";

export interface ICache<K, V> extends ICacheBase<K, V> {
    /**
     * Get a value mapped by the key, or <code>undefined</code> if not present
     * @param key key to get
     * @return the mapped value or <code>undefined</code>
     */
    getIfPresent(key: K): V | undefined;

    /**
     * Get a value mapped by the key, optionally retrieving it from the mapping function
     * @param key key to get
     * @param mappingFunction function to get a value from in case the stored value doesn't exist
     * @return the mapped value, the retrieved value or <code>undefined</code>
     */
    get(key: K, mappingFunction: MappingFunction<K, V>): V | undefined;

    /**
     * Get all values by keys. Undefined values are not returned
     * @param keys keys to get
     * @return map of key -> value
     */
    getAllPresent(keys: Iterable<K>): Map<K, V>;

    /**
     * Get all values by keys, optionally retrieving them from the mapping function
     * @param keys keys to get
     * @param mappingFunction function to get values for keys which do not exist
     * @return map of key -> value
     */
    getAll(keys: Iterable<K>, mappingFunction: MappingFunction<Iterable<K>, Map<K, V>>): Map<K, V>;

    /**
     * Add a key->value pair to the cache, replacing any previous value mapped by the key
     * @param key key
     * @param value value
     */
    put(key: K, value: V): void;

    /**
     * Add multiple entries to the cache
     * @param map key->value map
     */
    putAll(map: Map<K, V>): void;

    /**
     * Force-refresh a key's value
     */
    refresh(key: K): V;
}
