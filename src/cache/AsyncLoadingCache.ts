import { AsyncLoader, AsyncMappingFunction, AsyncMultiLoader, MappingFunction } from "../loaders";
import { Options } from "./CacheBase";
import { SimpleCache } from "./SimpleCache";
import { IAsyncCache } from "../interfaces/IAsyncCache";
import { CacheStats } from "../CacheStats";
import { CacheEvents } from "../CacheEvents";
import { EventEmitter } from "events";
import { asArray, CompletablePromise, keyPromiseMapToPromiseContainingMap } from "../util";
import { ICacheEventEmitter } from "../interfaces/ICacheEventEmitter";


export class AsyncLoadingCache<K, V> extends EventEmitter implements IAsyncCache<K, V>, ICacheEventEmitter {

    private readonly _cache: SimpleCache<K, Promise<V>>;

    readonly loader: AsyncLoader<K, V>;
    readonly multiLoader: AsyncMultiLoader<K, V>;

    constructor(options: Options, loader?: AsyncLoader<K, V>, multiLoader?: AsyncMultiLoader<K, V>, internalCache?: (options: Options) => SimpleCache<K, Promise<V>>) {
        super({});
        if (typeof internalCache !== "undefined") {
            this._cache = internalCache(options);
        } else {
            this._cache = new SimpleCache<K, Promise<V>>(options);
        }

        this.loader = loader;
        this.multiLoader = multiLoader;

        CacheEvents.forward(this._cache, this);
    }

    get options(): Options {
        return this.cache.options;
    }

    get cache(): SimpleCache<K, Promise<V>> {
        return this._cache;
    }

    get stats(): CacheStats {
        return this.cache.stats;
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

    /**
     * @internal
     */
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
            if (this.options.recordStats) {
                if (mapped) {
                    this.stats.inc(CacheStats.LOAD_SUCCESS)
                } else {
                    this.stats.inc(CacheStats.LOAD_FAIL);
                }
            }
            return mappedPromise;
        }
        if (this.loader) {
            return this._get(key, this.loader, true);
        }
        return undefined;
    }

    /// GET ALL

    getAllPresent(keys: Iterable<K>): Promise<Map<K, V>> {
        const present = this.cache.getAllPresent(keys);
        return keyPromiseMapToPromiseContainingMap<K, V>(present);
    }

    getAll(keys: Iterable<K>): Promise<Map<K, V>>;
    getAll(keys: Iterable<K>, mappingFunction?: MappingFunction<Iterable<K>, Map<K, V>>): Promise<Map<K, V>>;
    getAll(keys: Iterable<K>, mappingFunction?: AsyncMappingFunction<Iterable<K>, Map<K, V>>): Promise<Map<K, V>>;
    getAll(keys: Iterable<K>, mappingFunction?: MappingFunction<Iterable<K>, Map<K, V>> | AsyncMappingFunction<Iterable<K>, Map<K, V>>): Promise<Map<K, V>> {
        return this._getAll(keys, mappingFunction);
    }

    /**
     * @internal
     */
    _getAll(keys: Iterable<K>, mappingFunction?: MappingFunction<Iterable<K>, Map<K, V>> | AsyncMappingFunction<Iterable<K>, Map<K, V>>): Promise<Map<K, V>> {
        const keyArray = asArray<K>(keys);
        const present = this.cache.getAllPresent(keys);
        if (mappingFunction && present.size < keyArray.length) {
            const missingKeys = keyArray.filter(k => !present.has(k));
            if (missingKeys.length > 0) {
                const mapped: Map<K, V> | Promise<Map<K, V>> = mappingFunction(keys);
                let mappedPromise: Promise<Map<K, V>>;
                if (mapped instanceof Promise) {
                    mappedPromise = mapped as Promise<Map<K, V>>;
                } else {
                    mappedPromise = Promise.resolve(mapped);
                }

                // populate cache with pending promises to mark them as loading
                let pendingPromises: Map<K, CompletablePromise<V>> = new Map();
                for (let key of missingKeys) {
                    let promise = new CompletablePromise<V>();
                    this.put(key, promise.promise);
                    pendingPromises.set(key, promise);
                }

                return Promise.all([
                    keyPromiseMapToPromiseContainingMap<K, V>(present),
                    mappedPromise
                ]).then(([presentMap, newMap]) => {
                    for (let [key, promise] of pendingPromises) {
                        promise.resolve(newMap.get(key));
                    }

                    const combined = new Map<K, V>();
                    presentMap.forEach((v, k) => combined.set(k, v));
                    newMap.forEach((v, k) => combined.set(k, v));
                    if (this.options.recordStats) {
                        this.stats.inc(CacheStats.LOAD_SUCCESS, newMap.size);
                        this.stats.inc(CacheStats.LOAD_FAIL, missingKeys.length - newMap.size);
                    }
                    return combined;
                })
            }
        }
        if (this.multiLoader) {
            return this.getAll(keys, this.multiLoader);
        }
        if (this.loader) {
            for (let key of keys) {
                if (!present.has(key)) {
                    present.set(key, this.get(key));
                }
            }
        }
        return keyPromiseMapToPromiseContainingMap<K, V>(present);
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

    end() {
        this.cache.end();
    }

}

