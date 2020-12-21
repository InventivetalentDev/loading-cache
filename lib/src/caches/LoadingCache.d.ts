import { Loader, MappingFunction, MultiLoader } from "../loaders";
import { Options as BaseOptions } from "./CacheBase";
import { SimpleCache } from "./SimpleCache";
import { ICache } from "../interfaces/ICache";
export interface Options extends BaseOptions {
}
export declare class LoadingCache<K, V> implements ICache<K, V> {
    private readonly _cache;
    readonly loader: Loader<K, V>;
    readonly multiLoader: MultiLoader<K, V>;
    constructor(options: Options, loader: Loader<K, V>, multiLoader?: MultiLoader<K, V>);
    get cache(): SimpleCache<K, V>;
    getIfPresent(key: K): V | undefined;
    get(key: K): V | undefined;
    get(key: K, mappingFunction: MappingFunction<K, V>): V | undefined;
    _get(key: K, mappingFunction?: MappingFunction<K, V>, forceLoad?: boolean): V | undefined;
    getAllPresent(keys: Iterable<K>): Map<K, V>;
    getAll(keys: Iterable<K>): Map<K, V>;
    getAll(keys: Iterable<K>, mappingFunction: MappingFunction<Iterable<K>, Map<K, V>>): Map<K, V>;
    _getAll(keys: Iterable<K>, mappingFunction?: MappingFunction<Iterable<K>, Map<K, V>>): Map<K, V>;
    put(key: K, value: V): void;
    putAll(map: Map<K, V>): void;
    invalidate(key: K): void;
    invalidateAll(): void;
    invalidateAll(keys: Iterable<K>): void;
    refresh(key: K): V;
    keys(): IterableIterator<K>;
    has(key: K): boolean;
}
