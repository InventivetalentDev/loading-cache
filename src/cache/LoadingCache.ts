import { Loader, MappingFunction, MultiLoader } from "../loaders";
import { Options } from "./CacheBase";
import { SimpleCache } from "./SimpleCache";
import { ICache, ICacheEventEmitter } from "../interfaces";
import { CacheStats } from "../CacheStats";
import { EventEmitter } from "events";
import { CacheEvents } from "../CacheEvents";

export class LoadingCache<K, V> extends EventEmitter implements ICache<K, V>, ICacheEventEmitter {

    private readonly _cache: SimpleCache<K, V>;

    readonly loader: Loader<K, V>;
    readonly multiLoader: MultiLoader<K, V>;

    constructor(options: Options, loader?: Loader<K, V>, multiLoader?: MultiLoader<K, V>) {
        super({});
        this._cache = new SimpleCache<K, V>(options);

        this.loader = loader;
        this.multiLoader = multiLoader;

        CacheEvents.forward(this._cache, this);
    }

    get cache(): SimpleCache<K, V> {
        return this._cache;
    }

    get options(): Options {
        return this.cache.options;
    }

    get stats(): CacheStats {
        return this.cache.stats;
    }

    ///// GET

    getIfPresent(key: K): V | undefined {
        return this.cache.getIfPresent(key);
    }

    get(key: K): V | undefined;
    get(key: K, mappingFunction: MappingFunction<K, V>): V | undefined;
    get(key: K, mappingFunction?: MappingFunction<K, V>, forceLoad: boolean = false): V | undefined {
        return this._get(key, mappingFunction, forceLoad);
    }

    /**
     * @internal
     */
    _get(key: K, mappingFunction?: MappingFunction<K, V>, forceLoad: boolean = false): V | undefined {
        if (!forceLoad) {
            const present = this.getIfPresent(key);
            if (present) {
                return present;
            }
        }
        if (mappingFunction) {
            return this.cache._get(key, mappingFunction, true);
        }
        if (this.loader) {
            return this._get(key, this.loader, true);
        }
        return undefined;
    }

    /// GET ALL

    getAllPresent(keys: Iterable<K>): Map<K, V> {
        return this.cache.getAllPresent(keys);
    }

    getAll(keys: Iterable<K>): Map<K, V>;
    getAll(keys: Iterable<K>, mappingFunction: MappingFunction<Iterable<K>, Map<K, V>>): Map<K, V>;
    getAll(keys: Iterable<K>, mappingFunction?: MappingFunction<Iterable<K>, Map<K, V>>): Map<K, V> {
        return this._getAll(keys, mappingFunction);
    }

    /**
     * @internal
     */
    _getAll(keys: Iterable<K>, mappingFunction?: MappingFunction<Iterable<K>, Map<K, V>>): Map<K, V> {
        if (mappingFunction) {
            return this.cache.getAll(keys, mappingFunction);
        }
        if (this.multiLoader) {
            return this.cache.getAll(keys, this.multiLoader);
        }
        const present = this.cache.getAllPresent(keys);
        if (this.loader) {
            for (let key of keys) {
                if (!present.has(key)) {
                    present.set(key, this.get(key, this.loader));
                }
            }
        }
        return present;
    }

    ///// PUT

    put(key: K, value: V): void {
        this.cache.put(key, value);
    }

    putAll(map: Map<K, V>): void {
        this.cache.putAll(map);
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

    refresh(key: K): V {
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

