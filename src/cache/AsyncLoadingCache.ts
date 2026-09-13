import {
    AsyncLoader,
    AsyncMappingFunction,
    AsyncMultiLoader,
    AsyncMultiMappingFunction,
    MappingFunction,
    MultiMappingFunction
} from "../loaders";
import { Options, ResolvedOptions } from "./CacheBase";
import { SimpleCache } from "./SimpleCache";
import { IAsyncCache } from "../interfaces/IAsyncCache";
import { CacheStats } from "../CacheStats";
import { CacheEvents } from "../CacheEvents";
import { EventEmitter } from "events";
import { asArray, CompletablePromise, isValue, keyCompletablePromiseMapToPromiseContainingMap } from "../util";
import { ICacheEventEmitter } from "../interfaces/ICacheEventEmitter";


export class AsyncLoadingCache<K, V> extends EventEmitter implements IAsyncCache<K, V>, ICacheEventEmitter {

    private readonly _cache: SimpleCache<K, CompletablePromise<V | undefined>>;

    readonly loader: AsyncLoader<K, V> | undefined;
    readonly multiLoader: AsyncMultiLoader<K, V> | undefined;

    constructor(options: Options, loader?: AsyncLoader<K, V>, multiLoader?: AsyncMultiLoader<K, V>, internalCache?: (options: Options) => SimpleCache<K, CompletablePromise<V | undefined>>) {
        super({});
        if (typeof internalCache !== "undefined") {
            this._cache = internalCache(options);
        } else {
            this._cache = new SimpleCache<K, CompletablePromise<V | undefined>>(options);
        }

        this.loader = loader;
        this.multiLoader = multiLoader;

        CacheEvents.forward(this._cache, this);
    }

    get options(): ResolvedOptions {
        return this.cache.options;
    }

    get cache(): SimpleCache<K, CompletablePromise<V | undefined>> {
        return this._cache;
    }

    get stats(): CacheStats {
        return this.cache.stats;
    }

    ///// GET

    getIfPresent(key: K): Promise<V | undefined> | undefined {
        return this.cache.getIfPresent(key)?.promise;
    }

    get(key: K): Promise<V | undefined>;
    get(key: K, mappingFunction?: MappingFunction<K, V>): Promise<V | undefined>;
    get(key: K, mappingFunction?: AsyncMappingFunction<K, V>): Promise<V | undefined>;
    get(key: K, mappingFunction?: MappingFunction<K, V> | AsyncMappingFunction<K, V>, forceLoad: boolean = false): Promise<V | undefined> {
        return this._get(key, mappingFunction, forceLoad);
    }

    /**
     * @internal
     */
    _get(key: K, mappingFunction?: MappingFunction<K, V> | AsyncMappingFunction<K, V>, forceLoad: boolean = false): Promise<V | undefined> {
        if (!forceLoad) {
            const present = this.getIfPresent(key);
            // typeof check so a cached promise of a falsy value doesn't trigger a reload
            if (typeof present !== "undefined") {
                return present;
            }
        }
        if (mappingFunction) {
            const mapped: V | Promise<V | undefined> | undefined = mappingFunction(key);
            let mappedPromise: Promise<V | undefined>;
            if (mapped instanceof Promise) {
                mappedPromise = mapped;
            } else {
                mappedPromise = Promise.resolve(mapped);
            }
            const completable = CompletablePromise.of<V | undefined>(mappedPromise);
            this.cache.put(key, completable);
            this.trackLoad(key, completable, mappedPromise);
            return mappedPromise;
        }
        if (this.loader) {
            return this._get(key, this.loader, true);
        }
        // Nothing can produce a value - still a promise, so callers can always chain
        return Promise.resolve(undefined);
    }

    /**
     * Record load stats once the load settles and evict entries that failed to load,
     * so a transient error doesn't poison the key for the lifetime of the cache.
     */
    private trackLoad(key: K, completable: CompletablePromise<V | undefined>, promise: Promise<V | undefined>): void {
        // The cached promise is only awaited if somebody asks for the key again, so mark it
        // handled here - an unhandled rejection would otherwise take the whole process down
        completable.ignoreRejection();
        promise.then(
            value => {
                const loaded = isValue(value);
                if (this.options.recordStats) {
                    this.stats.inc(loaded ? CacheStats.LOAD_SUCCESS : CacheStats.LOAD_FAIL);
                }
                if (!loaded) {
                    this.invalidateIfSame(key, completable);
                }
            },
            error => {
                if (this.options.recordStats) {
                    this.stats.inc(CacheStats.LOAD_FAIL);
                }
                this.invalidateIfSame(key, completable);
                this.emitError(error);
            }
        );
    }

    /**
     * Invalidate the key only if it still maps to the given promise, so a concurrent
     * put/refresh isn't thrown away by a load that failed afterwards.
     */
    private invalidateIfSame(key: K, completable: CompletablePromise<V | undefined>): void {
        if (this.cache.peek(key) === completable) {
            this.cache.invalidate(key);
        }
    }

    private emitError(error: any): void {
        // 'error' throws if it is emitted without a listener, which is never what a cache wants
        if (this.listenerCount(CacheEvents.ERROR) > 0) {
            try {
                this.emit(CacheEvents.ERROR, error);
            } catch (e) {
                console.error(e);
            }
        }
    }

    /// GET ALL

    getAllPresent(keys: Iterable<K>): Promise<Map<K, V>> {
        const present = this.cache.getAllPresent(keys);
        return keyCompletablePromiseMapToPromiseContainingMap<K, V>(present);
    }

    getAll(keys: Iterable<K>): Promise<Map<K, V>>;
    getAll(keys: Iterable<K>, mappingFunction?: MultiMappingFunction<K, V>): Promise<Map<K, V>>;
    getAll(keys: Iterable<K>, mappingFunction?: AsyncMultiMappingFunction<K, V>): Promise<Map<K, V>>;
    getAll(keys: Iterable<K>, mappingFunction?: MultiMappingFunction<K, V> | AsyncMultiMappingFunction<K, V>): Promise<Map<K, V>> {
        return this._getAll(keys, mappingFunction);
    }

    /**
     * @internal
     */
    _getAll(keys: Iterable<K>, mappingFunction?: MultiMappingFunction<K, V> | AsyncMultiMappingFunction<K, V>): Promise<Map<K, V>> {
        const keyArray = asArray<K>(keys);
        const present = this.cache.getAllPresent(keys);
        if (mappingFunction) {
            // Deduplicated, so a repeated key isn't loaded (or counted) twice
            const missingKeys = asArray(new Set(keyArray.filter(k => !present.has(k))));
            if (missingKeys.length > 0) {
                // Only ask the loader for what isn't cached yet - passing every requested
                // key would re-load entries the cache already holds
                const mapped: Map<K, V> | Promise<Map<K, V> | undefined> | undefined = mappingFunction(missingKeys);
                let mappedPromise: Promise<Map<K, V> | undefined>;
                if (mapped instanceof Promise) {
                    mappedPromise = mapped;
                } else {
                    mappedPromise = Promise.resolve(mapped);
                }

                // populate cache with pending promises to mark them as loading
                const pending = new Map<K, CompletablePromise<V | undefined>>();
                for (let key of missingKeys) {
                    const completable = new CompletablePromise<V | undefined>();
                    completable.ignoreRejection();
                    pending.set(key, completable);
                    this.cache.put(key, completable);
                }

                const loaded = mappedPromise.then(mappedMap => {
                    const newMap = mappedMap ?? new Map<K, V>();
                    let loadedCount = 0;
                    pending.forEach((completable, key) => {
                        const value = newMap.get(key);
                        // Always settle the placeholder, otherwise anything already
                        // awaiting this key would hang forever
                        completable.resolve(value);
                        if (isValue(value)) {
                            loadedCount++;
                        } else {
                            this.invalidateIfSame(key, completable);
                        }
                    });
                    if (this.options.recordStats) {
                        this.stats.inc(CacheStats.LOAD_SUCCESS, loadedCount);
                        this.stats.inc(CacheStats.LOAD_FAIL, missingKeys.length - loadedCount);
                    }
                    return newMap;
                }, error => {
                    // Same here - a failed load must not leave pending entries behind
                    pending.forEach((completable, key) => {
                        completable.reject(error);
                        this.invalidateIfSame(key, completable);
                    });
                    if (this.options.recordStats) {
                        this.stats.inc(CacheStats.LOAD_FAIL, missingKeys.length);
                    }
                    this.emitError(error);
                    throw error;
                });

                return Promise.all([
                    keyCompletablePromiseMapToPromiseContainingMap<K, V>(present),
                    loaded
                ]).then(([presentMap, newMap]) => {
                    const combined = new Map<K, V>();
                    presentMap.forEach((v, k) => combined.set(k, v));
                    newMap.forEach((v, k) => combined.set(k, v));
                    return combined;
                });
            }

            // no missing keys to load
            return keyCompletablePromiseMapToPromiseContainingMap<K, V>(present);
        }
        if (this.multiLoader) {
            return this.getAll(keys, this.multiLoader);
        }
        if (this.loader) {
            for (let key of keys) {
                if (!present.has(key)) {
                    present.set(key, CompletablePromise.of<V | undefined>(this.get(key)).ignoreRejection());
                }
            }
        }
        return keyCompletablePromiseMapToPromiseContainingMap<K, V>(present);
    }

    ///// PUT

    put(key: K, value: V): void;
    put(key: K, value: Promise<V>): void;
    put(key: K, value: V | Promise<V>): void {
        if (value instanceof Promise) {
            // An explicitly stored promise is kept even if it rejects, but its rejection
            // must not surface as an unhandled one
            this.cache.put(key, CompletablePromise.of<V | undefined>(value as Promise<V>).ignoreRejection());
        } else {
            this.cache.put(key, CompletablePromise.completedPromise<V | undefined>(value as V));
        }
    }

    putAll(map: Map<K, V>): void {
        map.forEach((v, k) => {
            this.cache.put(k, CompletablePromise.completedPromise<V | undefined>(v));
        })
    }

    ///// INVALIDATE

    invalidate(key: K): void {
        this.cache.invalidate(key);
    }

    invalidateAll(): void;
    invalidateAll(keys: Iterable<K>): void;
    invalidateAll(keys?: Iterable<K>): void {
        if (keys) {
            this.cache.invalidateAll(keys);
        } else {
            this.cache.invalidateAll();
        }
    }

    refresh(key: K): Promise<V | undefined> {
        return this._get(key, undefined, true);
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

