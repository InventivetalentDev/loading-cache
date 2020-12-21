/// <reference types="node" />
import { EventEmitter } from "events";
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
export declare abstract class CacheBase<K, V> extends EventEmitter {
    private readonly data;
    private readonly _options;
    private _cleanupTimeout;
    protected constructor(options?: Options);
    get options(): Options;
    protected runCleanup(): void;
    protected deleteExpiredEntries(): void;
    /**
     * Get the raw entry without doing any checks
     */
    protected getEntryDirect(key: K): Entry<K, V> | undefined;
    /**
     * Get the entry after checking for expiration, or <code>undefined</code> if it doesn't exist or is expired
     */
    protected getEntryIfPresent(key: K): Entry<K, V> | undefined;
    protected putEntry(key: K, entry: Entry<K, V>): void;
    protected invalidateEntry(key: K): boolean;
    keys(): IterableIterator<K>;
    has(key: K): boolean;
}
export declare class Entry<K, V> {
    protected readonly key: K;
    protected value: V;
    protected accessTime: number;
    protected writeTime: number;
    constructor(key: K);
    getKey(): K;
    getValue(): V;
    setValue(v: V): V;
    isExpired(options: Options): boolean;
}
