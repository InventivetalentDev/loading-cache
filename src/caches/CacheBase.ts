import { EventEmitter } from "events";
import { Time } from "../util/Time";
import { CacheStats } from "../CacheStats";

const DEFAULT_OPTIONS: Options = {
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
 * Base class for all cache implementations
 */
export abstract class CacheBase<K, V> extends EventEmitter {

    private readonly data: Map<K, Entry<K, V>> = new Map<K, Entry<K, V>>();
    private readonly _stats: CacheStats = new CacheStats();
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

    get stats(): CacheStats {
        return this._stats;
    }

    protected runCleanup(): void {
        if (this.options.deleteOnExpiration) { // don't do anything if entries shouldn't be deleted
            this.deleteExpiredEntries();
            if (this.options.expirationInterval > 0) {
                this._cleanupTimeout = setTimeout(() => this.runCleanup(), this.options.expirationInterval);
            }
        }
    }

    protected deleteExpiredEntries(recordStats: boolean = this.options.recordStats): void {
        const toDelete: K[] = [];
        this.data.forEach(entry => {
            if (entry.isExpired(this.options)) {
                toDelete.push(entry.getKey());
                try {
                    this.emit("expire", entry.getKey(), entry.getValue());
                } catch (e) {
                    console.error(e);
                }
            }
        });
        toDelete.forEach(k => this.data.delete(k));
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
        if (!entry) {
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

    keys(): Array<K> {
        return Array.from(this.data.keys());
    }

    has(key: K): boolean {
        return this.data.has(key);
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
            if (Time.now - this.accessTime > options.expireAfterAccess) {
                return true;
            }
        }
        if (options.expireAfterWrite !== 0) {
            if (Time.now - this.writeTime > options.expireAfterWrite) {
                return true;
            }
        }
        return false;
    }
}
