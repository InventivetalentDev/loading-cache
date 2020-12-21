"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleCache = void 0;
const CacheBase_1 = require("./CacheBase");
/**
 * Simple cache without automated loading functionality
 */
class SimpleCache extends CacheBase_1.CacheBase {
    constructor(options) {
        super(options);
    }
    ///// GET
    getIfPresent(key) {
        const entry = this.getEntryIfPresent(key);
        if (!entry) {
            return undefined;
        }
        return entry.getValue();
    }
    get(key, mappingFunction) {
        const entry = this.getEntryIfPresent(key);
        if (entry) {
            return entry.getValue();
        }
        if (mappingFunction) {
            const mapped = mappingFunction(key);
            this.put(key, mapped);
            return mapped;
        }
        return undefined;
    }
    /// GET ALL
    getAllPresentEntries(keys) {
        const map = new Map();
        for (let key of keys) {
            let val = this.getEntryIfPresent(key);
            if (val) {
                map.set(key, val);
            }
        }
        return map;
    }
    getAllEntries(keys) {
        return this.getAllPresentEntries(keys);
    }
    getAllPresent(keys) {
        const entryMap = this.getAllPresentEntries(keys);
        const map = new Map();
        entryMap.forEach((v, k) => map.set(k, v.getValue()));
        return map;
    }
    getAll(keys, mappingFunction) {
        const present = this.getAllPresent(keys);
        if (mappingFunction) {
            const missingKeys = new Array();
            for (let key of keys) {
                if (!present.has(key)) {
                    missingKeys.push(key);
                }
            }
            if (missingKeys.length > 0) {
                const mapped = mappingFunction(missingKeys);
                this.putAll(mapped);
                const combined = new Map();
                present.forEach((v, k) => combined.set(k, v));
                mapped.forEach((v, k) => combined.set(k, v));
                return combined;
            }
        }
        return present;
    }
    ///// PUT
    put(key, value) {
        let entry = this.getEntryIfPresent(key);
        if (!entry) {
            // create new entry
            entry = new CacheBase_1.Entry(key);
        }
        // update value
        entry.setValue(value);
        this.putEntry(key, entry);
    }
    putAll(map) {
        map.forEach((v, k) => this.put(k, v));
    }
    ///// INVALIDATE
    invalidate(key) {
        super.invalidateEntry(key);
    }
    invalidateAll(keys) {
        if (!keys) {
            keys = this.keys();
        }
        for (let key of keys) {
            this.invalidate(key);
        }
    }
}
exports.SimpleCache = SimpleCache;
//# sourceMappingURL=SimpleCache.js.map