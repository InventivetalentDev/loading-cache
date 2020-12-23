import { Options } from "../caches/CacheBase";
import { CacheStats } from "../CacheStats";

export interface ICacheBase<K, V> {
    readonly options: Options;
    readonly stats: CacheStats;

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

    /**
     * Get the cache's keys
     */
    keys(): Array<K>;

    /**
     * Check if the cache contains a specific key
     */
    has(key: K): boolean;

    /**
     * Indicate that the cache is no longer used & clean up any internal stuff
     */
    end(): void;
}
