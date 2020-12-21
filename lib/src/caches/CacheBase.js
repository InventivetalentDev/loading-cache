"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Entry = exports.CacheBase = void 0;
const events_1 = require("events");
const Time_1 = require("../util/Time");
const DEFAULT_OPTIONS = {
    expireAfterAccess: 0,
    expireAfterWrite: 0,
    deleteOnExpiration: true,
    expirationInterval: Time_1.Time.minutes(5)
};
/**
 * Base class for all cache implementations
 */
class CacheBase extends events_1.EventEmitter {
    constructor(options) {
        super({});
        this.data = new Map();
        this._options = Object.assign(Object.assign({}, DEFAULT_OPTIONS), options);
        // Start cleanup task if enabled
        this.runCleanup();
    }
    get options() {
        return this._options;
    }
    runCleanup() {
        if (this.options.deleteOnExpiration) { // don't do anything if entries shouldn't be deleted
            this.deleteExpiredEntries();
            if (this.options.expirationInterval > 0) {
                this._cleanupTimeout = setTimeout(() => this.runCleanup(), this.options.expirationInterval);
            }
        }
    }
    deleteExpiredEntries() {
        const toDelete = [];
        this.data.forEach(entry => {
            if (entry.isExpired(this.options)) {
                toDelete.push(entry.getKey());
                try {
                    this.emit("expire", entry.getKey(), entry.getValue());
                }
                catch (e) {
                    console.error(e);
                }
            }
        });
        toDelete.forEach(k => this.data.delete(k));
    }
    ///// GET
    /**
     * Get the raw entry without doing any checks
     */
    getEntryDirect(key) {
        return this.data.get(key);
    }
    /**
     * Get the entry after checking for expiration, or <code>undefined</code> if it doesn't exist or is expired
     */
    getEntryIfPresent(key) {
        const entry = this.getEntryDirect(key);
        if (!entry) {
            return undefined;
        }
        if (entry.isExpired(this.options)) {
            if (this.options.deleteOnExpiration) {
                this.invalidateEntry(key);
            }
            return undefined;
        }
        return entry;
    }
    ///// PUT
    putEntry(key, entry) {
        this.data.set(key, entry);
    }
    ///// INVALIDATE
    invalidateEntry(key) {
        return this.data.delete(key);
    }
    /////
    keys() {
        return this.data.keys();
    }
    has(key) {
        return this.data.has(key);
    }
}
exports.CacheBase = CacheBase;
class Entry {
    constructor(key) {
        this.key = key;
    }
    getKey() {
        this.accessTime = Time_1.Time.now;
        return this.key;
    }
    getValue() {
        this.accessTime = Time_1.Time.now;
        return this.value;
    }
    setValue(v) {
        this.accessTime = Time_1.Time.now;
        this.writeTime = Time_1.Time.now;
        return this.value = v;
    }
    isExpired(options) {
        if (options.expireAfterAccess !== 0) {
            return Time_1.Time.now - this.accessTime > options.expireAfterAccess;
        }
        if (options.expireAfterWrite !== 0) {
            return Time_1.Time.now - this.writeTime > options.expireAfterWrite;
        }
        return false;
    }
}
exports.Entry = Entry;
//# sourceMappingURL=CacheBase.js.map