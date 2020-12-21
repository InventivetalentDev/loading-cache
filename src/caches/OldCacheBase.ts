import { EventEmitter } from "events";
import { Loader } from "../loaders";

const DEFAULT_OPTIONS: Options = {
    expireAfterAccess: 0,
    expireAfterWrite: 0,
    deleteOnExpiration: true,
    expirationInterval: Time.minutes(5)
};

export interface Options {
    /**
     * Delay in ms when to expire entries after they were last accessed<br/>
     * Defaults to <code>0</code> (don't expire)
     * @default 0
     */
    expireAfterAccess?: number;
    /**
     * Delay in ms when to expire entries after they were last written to<br/>
     * Defaults to <code>0</code> (don't expire)
     * @default 0
     */
    expireAfterWrite?: number;

    /**
     * Whether to delete entries entirely after they expire<br/>
     * Defaults to <code>true</code>
     * @default true
     */
    deleteOnExpiration?: boolean;

    /**
     * Interval in ms to run an expiration timer<br/>
     * Set to <code>0</code> to not run a timer & only expire when querying entries<br/>
     * Defaults to <code>3000</code> (Time.minutes(5))
     * @default
     */
    expirationInterval?: number;
}

/**
 * Base class for all cache implementations
 */
export abstract class CacheBase<K, V> extends EventEmitter {

    private readonly data: Map<K, Entry<K, V>> = new Map<K, Entry<K, V>>();
    private readonly _options: Options;
    private _cleanupTimeout: NodeJS.Timeout;

    protected constructor(options?: Options) {
        super({});
        this._options = { ...DEFAULT_OPTIONS, ...options };

        // Start cleanup task if enabled
        this.runCleanup();
    }

    get options(): Options {
        return this._options;
    }

    protected runCleanup(): void {
        if (this.options.deleteOnExpiration) { // don't do anything if entries shouldn't be deleted
            this.deleteExpiredEntries();
            if (this.options.expirationInterval > 0) {
                this._cleanupTimeout = setTimeout(() => this.runCleanup(), this.options.expirationInterval);
            }
        }
    }

    protected deleteExpiredEntries(): void {
        const toDelete: K[] = [];
        this.data.forEach(entry => {
            if (entry.isExpired(this.options)) {
                toDelete.push(entry.getKey());
            }
        });
        toDelete.forEach(k => this.data.delete(k));
    }


    ///// GET

    /**
     * Get the raw entry without doing any checks
     */
    protected getEntryDirect(key: K): Entry<K, V> | undefined {
        return this.data.get(key);
    }

    /**
     * Get the entry after checking for expiration, or <code>undefined</code> if it doesn't exist or is expired
     */
    protected getEntryIfPresent(key: K): Entry<K, V> | undefined {
        const entry = this.getEntryDirect(key);
        if (!entry) {
            return undefined;
        }
        if (entry.isExpired(this.options)) {
            this.delete(key);
            return undefined;
        }
        return entry;
    }

    /**
     * Get a value mapped by the cache
     * @param key key to get
     */
    getIfPresent(key: K): V | undefined {
        const entry = this.getEntryIfPresent(key);
        if (!entry) {
            return undefined;
        }
        return entry.getValue();
    }

    /**
     * Get a value, or <code>undefined</code> if it doesn't exist
     */
    get(key: K, loader?: Loader<K, V>): V | undefined {
        const cached = this.getIfPresent(key);
        if (cached) {
            return cached;
        }
        if (loader) {

        }
    }

    /// GET ALL

    /* protected getAllPresentEntries(keys: Array<K>): Map<K, Entry<K, V>> implementation specific return type */

    /* protected getAllEntries(keys: Array<K>): Map<K, Entry<K, V>> implementation specific return type */

    /* getAllPresent(keys: Array<K>): Map<K,V> implementation specific return type */

    ///// PUT

    protected putEntry(key: K, entry: Entry<K, V>): void {
        this.data.set(key, entry);
    }

    put(key: K, value: V): void {
        let entry = this.getEntryIfPresent(key);
        if (!entry) {
            // create new entry
            entry = new Entry<K, V>(key)
        }
        // update value
        entry.setValue(value);
        this.putEntry(key, entry);
    }

    ///// DELETE

    protected deleteEntry(key: K): boolean {
        return this.data.delete(key);
    }

    /**
     * Delete a value mapped by the cache
     * @param key key to delete
     * @return <code>true</code> if something was deleted
     */
    delete(key: K): boolean {
        return this.deleteEntry(key);
    }

}

export class Entry<K, V> {
    protected readonly key: K;
    protected value: V;

    protected accessTime: number;
    protected writeTime: number;

    constructor(key: K) {
        this.key = key;
    }

    getKey(): K {
        this.accessTime = Time.now
        return this.key;
    }

    getValue(): V {
        this.accessTime = Time.now;
        return this.value;
    }

    setValue(v: V): V {
        this.accessTime = Time.now;
        this.writeTime = Time.now;
        return this.value = v;
    }

    isExpired(options: Options) {
        if (options.expireAfterAccess !== 0) {
            return Time.now - this.accessTime > options.expireAfterAccess;
        }
        if (options.expireAfterWrite !== 0) {
            return Time.now - this.writeTime > options.expireAfterWrite;
        }
        return false;
    }
}
