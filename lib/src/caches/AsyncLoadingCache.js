"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncLoadingCache = void 0;
const SimpleCache_1 = require("./SimpleCache");
class AsyncLoadingCache {
    constructor(options, loader, multiLoader) {
        this._cache = new SimpleCache_1.SimpleCache();
        this.loader = loader;
        this.multiLoader = multiLoader;
    }
    get cache() {
        return this._cache;
    }
    keyPromiseMapToPromiseContainingMap(keyToPromiseMap) {
        return new Promise(resolve => {
            const keys = keyToPromiseMap.keys();
            const values = keyToPromiseMap.values();
            Promise.all(values).then(resolvedValues => {
                const valueMap = new Map();
                let i = 0;
                // The promises *should* be in the original order of the map
                for (let key of keys) {
                    let promise = resolvedValues[i++];
                    valueMap.set(key, promise);
                }
                resolve(valueMap);
            });
        });
    }
    ///// GET
    getIfPresent(key) {
        return this.cache.getIfPresent(key);
    }
    get(key, mappingFunction, forceLoad = false) {
        return this._get(key, mappingFunction, forceLoad);
    }
    _get(key, mappingFunction, forceLoad = false) {
        if (!forceLoad) {
            const present = this.getIfPresent(key);
            if (present) {
                return present;
            }
        }
        if (mappingFunction) {
            const mapped = mappingFunction(key);
            let mappedPromise;
            if (mapped instanceof Promise) {
                mappedPromise = mapped;
            }
            else {
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
    getAllPresent(keys) {
        const present = this.cache.getAllPresent(keys);
        return this.keyPromiseMapToPromiseContainingMap(present);
    }
    getAll(keys, mappingFunction) {
        return this._getAll(keys, mappingFunction);
    }
    _getAll(keys, mappingFunction) {
        const present = this.cache.getAllPresent(keys);
        if (mappingFunction) {
            const missingKeys = new Array();
            for (let key of keys) {
                if (!present.has(key)) {
                    missingKeys.push(key);
                }
            }
            if (missingKeys.length > 0) {
                const mapped = mappingFunction(keys);
                let mappedPromise;
                if (mapped instanceof Promise) {
                    mappedPromise = mapped;
                }
                else {
                    mappedPromise = Promise.resolve(mapped);
                }
                return Promise.all([
                    this.keyPromiseMapToPromiseContainingMap(present),
                    mappedPromise
                ]).then(([presentMap, newMap]) => {
                    this.putAll(newMap);
                    const combined = new Map();
                    presentMap.forEach((v, k) => combined.set(k, v));
                    newMap.forEach((v, k) => combined.set(k, v));
                    return combined;
                });
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
    put(key, value) {
        if (value instanceof Promise) {
            this.cache.put(key, value);
        }
        else {
            this.cache.put(key, Promise.resolve(value));
        }
    }
    putAll(map) {
        map.forEach((v, k) => {
            this.cache.put(k, Promise.resolve(v));
        });
    }
    ///// INVALIDATE
    invalidate(key) {
        this.cache.invalidate(key);
    }
    invalidateAll(keys) {
        this.cache.invalidateAll(keys);
    }
    refresh(key) {
        return this._get(key, null, true);
    }
    /////
    keys() {
        return this.cache.keys();
    }
    has(key) {
        return this.cache.has(key);
    }
}
exports.AsyncLoadingCache = AsyncLoadingCache;
//# sourceMappingURL=AsyncLoadingCache.js.map