import { AsyncLoader, AsyncMappingFunction, AsyncMultiLoader, MappingFunction } from "../loaders";
import { Options as BaseOptions } from "./CacheBase";
import { SimpleCache } from "./SimpleCache";
import { IAsyncCache } from "../interfaces/IAsyncCache";
import { CacheStats } from "../CacheStats";
import { CacheEvents } from "../CacheEvents";
import { EventEmitter } from "events";

export interface Options extends BaseOptions {
}


export class AsyncLoadingCache<K, V> extends EventEmitter implements IAsyncCache<K, V> {

    private readonly _cache: SimpleCache<K, Promise<V>>;

    readonly loader: AsyncLoader<K, V>;
    readonly multiLoader: AsyncMultiLoader<K, V>;

    constructor(options: Options, loader: AsyncLoader<K, V>, multiLoader?: AsyncMultiLoader<K, V>) {
        super({});
        this._cache = new SimpleCache<K, Promise<V>>(options);

        this.loader = loader;
        this.multiLoader = multiLoader;

        CacheEvents.forward(this._cache, this);
    }

    get cache(): SimpleCache<K, Promise<V>> {
        return this._cache;
    }

    get stats(): CacheStats {
        return this.cache.stats;
    }

    protected keyPromiseMapToPromiseContainingMap(keyToPromiseMap: Map<K, Promise<V>>): Promise<Map<K, V>> {
        return new Promise<Map<K, V>>(resolve => {
            const keys = keyToPromiseMap.keys();
            const values = keyToPromiseMap.values();
            Promise.all(values).then(resolvedValues => {
                const valueMap = new Map<K, V>();
                let i = 0;
                // The promises *should* be in the original order of the map
                for (let key of keys) {
                    let promise = resolvedValues[i++];
                    valueMap.set(key, promise);
                }
                resolve(valueMap);
            })
        })
    }

    ///// GET

    getIfPresent(key: K): Promise<V | undefined> | undefined {
        return this.cache.getIfPresent(key);
    }

    get(key: K): Promise<V>;
    get(key: K, mappingFunction?: MappingFunction<K, V>): Promise<V>;
    get(key: K, mappingFunction?: AsyncMappingFunction<K, V>): Promise<V>;
    get(key: K, mappingFunction?: MappingFunction<K, V> | AsyncMappingFunction<K, V>, forceLoad: boolean = false): Promise<V> {
        return this._get(key, mappingFunction, forceLoad);
    }

    _get(key: K, mappingFunction?: MappingFunction<K, V> | AsyncMappingFunction<K, V>, forceLoad: boolean = false): Promise<V> {
        if (!forceLoad) {
            const present = this.getIfPresent(key);
            if (present) {
                return present;
            }
        }
        if (mappingFunction) {
            const mapped: V | Promise<V> = mappingFunction(key);
            let mappedPromise: Promise<V>;
            if (mapped instanceof Promise) {
                mappedPromise = mapped as Promise<V>;
            } else {
                mappedPromise = Promise.resolve(mapped);
            }
            this.put(key, mappedPromise);
            return mappedPromise;
        }
        if (this.loader) {
            return this._get(key, this.loader);
        }
        return undefined;
    }

    /// GET ALL

    getAllPresent(keys: Iterable<K>): Promise<Map<K, V>> {
        const present = this.cache.getAllPresent(keys);
        return this.keyPromiseMapToPromiseContainingMap(present);
    }


    getAll(keys: Iterable<K>): Promise<Map<K, V>>;
    getAll(keys: Iterable<K>, mappingFunction?: MappingFunction<Iterable<K>, Map<K, V>>): Promise<Map<K, V>>;
    getAll(keys: Iterable<K>, mappingFunction?: AsyncMappingFunction<Iterable<K>, Map<K, V>>): Promise<Map<K, V>>;
    getAll(keys: Iterable<K>, mappingFunction?: MappingFunction<Iterable<K>, Map<K, V>> | AsyncMappingFunction<Iterable<K>, Map<K, V>>): Promise<Map<K, V>> {
        return this._getAll(keys, mappingFunction);
    }

    _getAll(keys: Iterable<K>, mappingFunction?: MappingFunction<Iterable<K>, Map<K, V>> | AsyncMappingFunction<Iterable<K>, Map<K, V>>): Promise<Map<K, V>> {
        const present = this.cache.getAllPresent(keys);
        if (mappingFunction) {
            const missingKeys = new Array<K>();
            for (let key of keys) {
                if (!present.has(key)) {
                    missingKeys.push(key);
                }
            }
            if (missingKeys.length > 0) {
                const mapped: Map<K, V> | Promise<Map<K, V>> = mappingFunction(keys);
                let mappedPromise: Promise<Map<K, V>>;
                if (mapped instanceof Promise) {
                    mappedPromise = mapped as Promise<Map<K, V>>;
                } else {
                    mappedPromise = Promise.resolve(mapped);
                }

                return Promise.all([
                    this.keyPromiseMapToPromiseContainingMap(present),
                    mappedPromise
                ]).then(([presentMap, newMap]) => {
                    this.putAll(newMap);

                    const combined = new Map<K, V>();
                    presentMap.forEach((v, k) => combined.set(k, v));
                    newMap.forEach((v, k) => combined.set(k, v));
                    return combined;
                })
            }
        }
        if (this.multiLoader) {
            return this.getAll(keys, this.multiLoader);
        }
        if (this.loader) {
            for (let key of keys) {
                present.set(key, this.get(key));
            }
        }
        return this.keyPromiseMapToPromiseContainingMap(present);
    }


    ///// PUT

    put(key: K, value: V): void;
    put(key: K, value: Promise<V>): void;
    put(key: K, value: V | Promise<V>): void {
        if (value instanceof Promise) {
            this.cache.put(key, value as Promise<V>);
        } else {
            this.cache.put(key, Promise.resolve(value));
        }
    }

    putAll(map: Map<K, V>): void {
        map.forEach((v, k) => {
            this.cache.put(k, Promise.resolve(v));
        })
    }

    ///// INVALIDATE

    invalidate(key: K): void {
        this.cache.invalidate(key);
    }

    invalidateAll(): void;
    invalidateAll(keys: Iterable<K>): void;
    invalidateAll(keys?: Iterable<K>): void {
        this.cache.invalidateAll(keys);
    }

    refresh(key: K): Promise<V> {
        return this._get(key, null, true);
    }

    /////

    keys(): Array<K> {
        return this.cache.keys();
    }

    has(key: K): boolean {
        return this.cache.has(key);
    }

}

