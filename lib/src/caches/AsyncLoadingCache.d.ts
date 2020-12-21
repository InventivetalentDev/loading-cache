import { AsyncLoader, AsyncMappingFunction, AsyncMultiLoader, MappingFunction } from "../loaders";
import { Options as BaseOptions } from "./CacheBase";
import { SimpleCache } from "./SimpleCache";
import { IAsyncCache } from "../interfaces/IAsyncCache";
export interface Options extends BaseOptions {
}
export declare class AsyncLoadingCache<K, V> implements IAsyncCache<K, V> {
    private readonly _cache;
    readonly loader: AsyncLoader<K, V>;
    readonly multiLoader: AsyncMultiLoader<K, V>;
    constructor(options: Options, loader: AsyncLoader<K, V>, multiLoader?: AsyncMultiLoader<K, V>);
    get cache(): SimpleCache<K, Promise<V>>;
    protected keyPromiseMapToPromiseContainingMap(keyToPromiseMap: Map<K, Promise<V>>): Promise<Map<K, V>>;
    getIfPresent(key: K): Promise<V | undefined> | undefined;
    get(key: K): Promise<V>;
    get(key: K, mappingFunction?: MappingFunction<K, V>): Promise<V>;
    get(key: K, mappingFunction?: AsyncMappingFunction<K, V>): Promise<V>;
    _get(key: K, mappingFunction?: MappingFunction<K, V> | AsyncMappingFunction<K, V>, forceLoad?: boolean): Promise<V>;
    getAllPresent(keys: Iterable<K>): Promise<Map<K, V>>;
    getAll(keys: Iterable<K>): Promise<Map<K, V>>;
    getAll(keys: Iterable<K>, mappingFunction?: MappingFunction<Iterable<K>, Map<K, V>>): Promise<Map<K, V>>;
    getAll(keys: Iterable<K>, mappingFunction?: AsyncMappingFunction<Iterable<K>, Map<K, V>>): Promise<Map<K, V>>;
    _getAll(keys: Iterable<K>, mappingFunction?: MappingFunction<Iterable<K>, Map<K, V>> | AsyncMappingFunction<Iterable<K>, Map<K, V>>): Promise<Map<K, V>>;
    put(key: K, value: V): void;
    put(key: K, value: Promise<V>): void;
    putAll(map: Map<K, V>): void;
    invalidate(key: K): void;
    invalidateAll(): void;
    invalidateAll(keys: Iterable<K>): void;
    refresh(key: K): Promise<V>;
    keys(): IterableIterator<K>;
    has(key: K): boolean;
}
