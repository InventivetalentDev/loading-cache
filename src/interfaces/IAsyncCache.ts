import { AsyncMappingFunction, MappingFunction } from "../loaders";
import { CacheStats } from "../CacheStats";
import { Options } from "../caches/CacheBase";
import { IEndable } from "./IEndable";

export interface IAsyncCache<K, V> extends IEndable {

    readonly options: Options;
    readonly stats: CacheStats;

    /**
     * Get a value mapped by the key, or <code>undefined</code> if not present
     * @param key key to get
     * @return promise of the mapped value or <code>undefined</code>
     */
    getIfPresent(key: K): Promise<V | undefined> | undefined;

    /**
     * Get a value mapped by the key, optionally retrieving it from the mapping function
     * @param key key to get
     * @param mappingFunction function to get a value from in case the stored value doesn't exist
     * @return promise of the mapped value or the retrieved value
     */
    get(key: K, mappingFunction: MappingFunction<K, V>): Promise<V>;

    /**
     * Get a value mapped by the key, optionally retrieving it from the mapping function
     * @param key key to get
     * @param mappingFunction function to get a value from in case the stored value doesn't exist
     * @return promise of the mapped value or the retrieved value
     */
    get(key: K, mappingFunction: AsyncMappingFunction<K, V>): Promise<V>;

    /**
     * Get all values by keys. Undefined values are not returned
     * @param keys keys to get
     * @return promise of key -> value map
     */
    getAllPresent(keys: Iterable<K>): Promise<Map<K, V>>;

    /**
     * Get all values by keys, optionally retrieving them from the mapping function
     * @param keys keys to get
     * @param mappingFunction function to get values for keys which do not exist
     * @return map of key -> value
     */
    getAll(keys: Iterable<K>, mappingFunction: MappingFunction<Iterable<K>, Map<K, V>>): Promise<Map<K, V>>;

    /**
     * Get all values by keys, optionally retrieving them from the mapping function
     * @param keys keys to get
     * @param mappingFunction function to get values for keys which do not exist
     * @return map of key -> value
     */
    getAll(keys: Iterable<K>, mappingFunction: AsyncMappingFunction<Iterable<K>, Map<K, V>>): Promise<Map<K, V>>;

    /**
     * Add a key->value pair to the cache, replacing any previous value mapped by the key
     * @param key key
     * @param value value
     */
    put(key: K, value: V): void;

    /**
     * Add a key->value pair to the cache, replacing any previous value mapped by the key
     * @param key key
     * @param value value
     */
    put(key: K, value: Promise<V>): void;

    /**
     * Add multiple entries to the cache
     * @param map key->value map
     */
    putAll(map: Map<K, V>): void;

    /**
     * Remove any cached value for the key
     * @param key key to remove
     */
    invalidate(key: K): void;

    /**
     * Remove any cached values for the keys
     * @param keys keys to remove
     */
    invalidateAll(keys: Iterable<K>): void;

    /**
     * Remove all entries from the cache
     */
    invalidateAll(): void;

    keys(): Array<K>;

    has(key: K): boolean;
}
