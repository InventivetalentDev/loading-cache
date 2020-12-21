"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadingCache = void 0;
const SimpleCache_1 = require("./SimpleCache");
class LoadingCache {
    constructor(options, loader, multiLoader) {
        this._cache = new SimpleCache_1.SimpleCache();
        this.loader = loader;
        this.multiLoader = multiLoader;
    }
    get cache() {
        return this._cache;
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
            return this.cache.get(key, mappingFunction);
        }
        if (this.loader) {
            return this.cache.get(key, this.loader);
        }
        return undefined;
    }
    /// GET ALL
    getAllPresent(keys) {
        return this.cache.getAllPresent(keys);
    }
    getAll(keys, mappingFunction) {
        return this._getAll(keys, mappingFunction);
    }
    _getAll(keys, mappingFunction) {
        const present = this.cache.getAllPresent(keys);
        if (mappingFunction) {
            return this.cache.getAll(keys, mappingFunction);
        }
        if (this.multiLoader) {
            return this.cache.getAll(keys, this.multiLoader);
        }
        if (this.loader) {
            for (let key of keys) {
                present.set(key, this.get(key, this.loader));
            }
        }
        return present;
    }
    ///// PUT
    put(key, value) {
        this.cache.put(key, value);
    }
    putAll(map) {
        this.cache.putAll(map);
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
exports.LoadingCache = LoadingCache;
//# sourceMappingURL=LoadingCache.js.map