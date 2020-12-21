import { CacheBase, Entry, Options } from "./CacheBase";
import { MappingFunction } from "../loaders";
import { ICache } from "../interfaces/ICache";
/**
 * Simple cache without automated loading functionality
 */
export declare class SimpleCache<K, V> extends CacheBase<K, V> implements ICache<K, V> {
    constructor(options?: Options);
    getIfPresent(key: K): V | undefined;
    get(key: K, mappingFunction: MappingFunction<K, V>): V | undefined;
    protected getAllPresentEntries(keys: Iterable<K>): Map<K, Entry<K, V>>;
    protected getAllEntries(keys: Iterable<K>): Map<K, Entry<K, V>>;
    getAllPresent(keys: Iterable<K>): Map<K, V>;
    getAll(keys: Iterable<K>, mappingFunction: MappingFunction<Iterable<K>, Map<K, V>>): Map<K, V>;
    put(key: K, value: V): void;
    putAll(map: Map<K, V>): void;
    invalidate(key: K): void;
    invalidateAll(): void;
    invalidateAll(keys: Iterable<K>): void;
}
