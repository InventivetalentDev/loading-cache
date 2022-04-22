import { CacheBase, Entry, Options } from "./CacheBase";
import { MappingFunction } from "../loaders";
import { ICache } from "../interfaces/ICache";
import { CacheStats } from "../CacheStats";
import { asArray } from "../util";
import { ICacheEventEmitter } from "../interfaces/ICacheEventEmitter";

/**
 * Simple cache without automated loading functionality
 */
export class SimpleCache<K, V> extends CacheBase<K, V> implements ICache<K, V>, ICacheEventEmitter {

    constructor(options?: Options) {
        super(options);
    }

    ///// GET

    getIfPresent(key: K): V | undefined {
        const entry = this.getEntryIfPresent(key);
        if (typeof entry === "undefined") {
            return undefined;
        }
        return entry.getValue();
    }

    get(key: K, mappingFunction: MappingFunction<K, V>): V | undefined {
        return this._get(key, mappingFunction);
    }

    /**
     * @internal
     */
    _get(key: K, mappingFunction: MappingFunction<K, V>, forceLoad: boolean = false): V | undefined {
        if (!forceLoad) {
            const entry = this.getEntryIfPresent(key);
            if (entry) {
                return entry.getValue();
            }
        }
        if (mappingFunction) {
            const mapped = mappingFunction(key);
            if (mapped) {
                this.put(key, mapped);
            }
            if (this.options.recordStats) {
                if (mapped) {
                    this.stats.inc(CacheStats.LOAD_SUCCESS)
                } else {
                    this.stats.inc(CacheStats.LOAD_FAIL);
                }
            }
            return mapped;
        }
        return undefined;
    }

    /// GET ALL

    protected getAllPresentEntries(keys: Iterable<K>): Map<K, Entry<K, V>> {
        const map = new Map<K, Entry<K, V>>();
        for (let key of keys) {
            let val = this.getEntryIfPresent(key);
            if (typeof val !== "undefined") {
                map.set(key, val);
            }
        }
        return map;
    }

    protected getAllEntries(keys: Iterable<K>): Map<K, Entry<K, V>> {
        return this.getAllPresentEntries(keys);
    }

    getAllPresent(keys: Iterable<K>): Map<K, V> {
        const entryMap = this.getAllPresentEntries(keys);
        const map = new Map<K, V>();
        entryMap.forEach((v, k) => map.set(k, v.getValue()));
        return map;
    }

    getAll(keys: Iterable<K>, mappingFunction: MappingFunction<Iterable<K>, Map<K, V>>): Map<K, V> {
        const keyArray = asArray(keys);
        const present = this.getAllPresent(keys);
        if (mappingFunction && present.size < keyArray.length) {
            const missingKeys = keyArray.filter(k => !present.has(k));
            if (missingKeys.length > 0) {
                const mapped = mappingFunction(missingKeys);
                this.putAll(mapped);

                const combined = new Map<K, V>();
                present.forEach((v, k) => combined.set(k, v));
                mapped.forEach((v, k) => combined.set(k, v));
                if (this.options.recordStats) {
                    this.stats.inc(CacheStats.LOAD_SUCCESS, mapped.size);
                    this.stats.inc(CacheStats.LOAD_FAIL, missingKeys.length - mapped.size);
                }
                return combined;
            }
        }
        return present;
    }

    ///// PUT

    put(key: K, value: V): void {
        let entry = this.getEntryIfPresent(key, false);
        if (typeof entry === "undefined") {
            // create new entry
            entry = new Entry<K, V>(key)
        }
        // update value
        entry.setValue(value);
        this.putEntry(key, entry);
    }

    putAll(map: Map<K, V>) {
        map.forEach((v, k) => this.put(k, v));
    }


    ///// INVALIDATE

    invalidate(key: K) {
        super.invalidateEntry(key);
    }

    invalidateAll(): void;
    invalidateAll(keys: Iterable<K>): void;
    invalidateAll(keys?: Iterable<K>): void {
        if (!keys) {
            keys = this.keys();
        }
        for (let key of keys) {
            this.invalidate(key);
        }
    }

    refresh(key: K): V {
        // Don't really have a way to properly refresh in SimpleCache
        return this.getIfPresent(key);
    }

}
