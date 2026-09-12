import { EventEmitter } from "events";
import { CacheStats } from "../CacheStats";
import { CacheEvents } from "../CacheEvents";
import { asArray } from "../util";
import { ICacheEventEmitter } from "../interfaces/ICacheEventEmitter";
import { Time } from "@inventivetalent/time";

/**
 * {@link Options} after the defaults have been applied - every field is set
 */
export type ResolvedOptions = Required<Options>;

const DEFAULT_OPTIONS: ResolvedOptions = {
    expireAfterAccess: 0,
    expireAfterWrite: 0,
    deleteOnExpiration: true,
    expirationInterval: Time.minutes(5),
    recordStats: true
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
     * @default 3000
     */
    expirationInterval?: number;

    /**
     * Whether to record stats
     * @default true
     */
    recordStats?: boolean;
}

/**
 * Apply the defaults. Fields explicitly set to <code>undefined</code> fall back to the
 * default rather than unsetting it.
 */
function resolveOptions(options: Options = {}): ResolvedOptions {
    return {
        expireAfterAccess: options.expireAfterAccess ?? DEFAULT_OPTIONS.expireAfterAccess,
        expireAfterWrite: options.expireAfterWrite ?? DEFAULT_OPTIONS.expireAfterWrite,
        deleteOnExpiration: options.deleteOnExpiration ?? DEFAULT_OPTIONS.deleteOnExpiration,
        expirationInterval: options.expirationInterval ?? DEFAULT_OPTIONS.expirationInterval,
        recordStats: options.recordStats ?? DEFAULT_OPTIONS.recordStats
    };
}

/**
 * Base class for all cache implementations
 */
export abstract class CacheBase<K, V> extends EventEmitter implements ICacheEventEmitter {

    private readonly data: Map<K, Entry<K, V>> = new Map<K, Entry<K, V>>();
    private readonly _stats: CacheStats = new CacheStats();
    private readonly _options: ResolvedOptions;
    private _cleanupTimeout: ReturnType<typeof setTimeout> | undefined;

    protected constructor(options?: Options) {
        super({});
        this._options = resolveOptions(options);

        // Start cleanup task if enabled
        this.runCleanup();

        CacheEvents.forward(this._stats, this);
    }

    get options(): ResolvedOptions {
        return this._options;
    }

    get stats(): CacheStats {
        return this._stats;
    }

    protected runCleanup(): void {
        if (this.options.deleteOnExpiration) { // don't do anything if entries shouldn't be deleted
            this.deleteExpiredEntries();
            if (this.options.expirationInterval > 0) {
                this._cleanupTimeout = setTimeout(() => this.runCleanup(), this.options.expirationInterval);
                // Don't keep the process alive just for the cleanup timer
                if (typeof (this._cleanupTimeout as any)?.unref === "function") {
                    (this._cleanupTimeout as any).unref();
                }
            }
        }
    }

    protected stopCleanupTimer() {
        if (typeof this._cleanupTimeout !== "undefined") {
            clearTimeout(this._cleanupTimeout);
            this._cleanupTimeout = undefined;
        }
    }

    protected deleteExpiredEntries(recordStats: boolean = this.options.recordStats): void {
        const toDelete: Entry<K, V>[] = [];
        this.data.forEach(entry => {
            if (entry.isExpired(this.options)) {
                toDelete.push(entry);
            }
        });
        toDelete.forEach(entry => {
            // Route through invalidateEntry so subclasses can clean up backing stores
            this.invalidateEntry(entry.peekKey());
            try {
                this.emit(CacheEvents.EXPIRE, entry.peekKey(), entry.peekValue());
            } catch (e) {
                console.error(e);
            }
        });
        if (recordStats) {
            this.stats.inc(CacheStats.EXPIRE, toDelete.length);
        }
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
    protected getEntryIfPresent(key: K, recordStats: boolean = this.options.recordStats): Entry<K, V> | undefined {
        const entry = this.getEntryDirect(key);
        if (typeof entry === "undefined") {
            if (recordStats) {
                this.stats.inc(CacheStats.MISS);
            }
            return undefined;
        }
        if (entry.isExpired(this.options)) {
            if (this.options.deleteOnExpiration) {
                this.invalidateEntry(key);
                if (recordStats) {
                    this.stats.inc(CacheStats.EXPIRE);
                }
            }
            if (recordStats) {
                this.stats.inc(CacheStats.MISS);
            }
            return undefined;
        }
        if (recordStats) {
            this.stats.inc(CacheStats.HIT);
        }
        return entry;
    }

    ///// PUT

    protected putEntry(key: K, entry: Entry<K, V>): void {
        this.data.set(key, entry);
    }

    ///// INVALIDATE

    protected invalidateEntry(key: K): boolean {
        return this.data.delete(key);
    }

    /////

    /**
     * Every stored key, including entries that have expired but not been swept yet.<br/>
     * For internal bookkeeping - {@link keys} is the public, expiration-aware view.
     */
    protected allKeys(): Array<K> {
        return asArray(this.data.keys());
    }

    keys(): Array<K> {
        const keys: Array<K> = [];
        this.data.forEach((entry, key) => {
            // Expired entries are not retrievable, so they must not be listed either -
            // they can linger here until the cleanup sweep (or forever, with
            // deleteOnExpiration disabled)
            if (!entry.isExpired(this.options)) {
                keys.push(key);
            }
        });
        return keys;
    }

    has(key: K): boolean {
        const entry = this.data.get(key);
        // Checked against expiration so has() can never disagree with getIfPresent()
        return typeof entry !== "undefined" && !entry.isExpired(this.options);
    }

    end(): void {
        this.stopCleanupTimer();
        this.data.clear();
    }

}

export class Entry<K, V> {
    protected readonly key: K;
    // Always assigned right after construction, through setValue or fromJson
    protected value!: V;

    protected accessTime: number;
    protected writeTime: number;

    constructor(key: K) {
        this.key = key;
        this.accessTime = Time.now;
        this.writeTime = Time.now;
    }

    static fromJson<K, V>(key: any, value: any): Entry<K, V> {
        const entry = new Entry<K, V>(key);
        entry.value = value["value"];
        entry.accessTime = value["accessTime"];
        entry.writeTime = value["writeTime"];
        return entry;
    }

    /**
     * Get the key without counting it as an access
     */
    peekKey(): K {
        return this.key;
    }

    /**
     * Get the value without counting it as an access
     */
    peekValue(): V {
        return this.value;
    }

    getKey(): K {
        this.accessTime = Time.now;
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

    isExpired(options: Options): boolean {
        // Defaulted locally so a plain Options with missing fields never expires by accident
        const expireAfterAccess = options.expireAfterAccess ?? 0;
        const expireAfterWrite = options.expireAfterWrite ?? 0;
        if (expireAfterAccess > 0 && Time.now - this.accessTime > expireAfterAccess) {
            return true;
        }
        if (expireAfterWrite > 0 && Time.now - this.writeTime > expireAfterWrite) {
            return true;
        }
        return false;
    }
}
