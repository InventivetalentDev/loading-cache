import { Entry, Options } from "./CacheBase";
import { SimpleCache } from "./SimpleCache";

/**
 * Wrapper around simple string KV getter/setter/deleter functions
 * Intended for e.g. creating a persistent cache using the browser's localStorage
 */
export class WrappedCache<K, V> extends SimpleCache<K, V> {

    constructor(options: Options, readonly getter: (key: string) => string | null, readonly setter: (key: string, value: string) => void, readonly deleter: (key: string) => void | boolean, readonly allDeleter?: () => void) {
        super(options);
    }

    protected getEntryIfPresent(key: K, recordStats: boolean = this.options.recordStats): Entry<K, V> | undefined {
        const s = super.getEntryIfPresent(key, recordStats);
        if (s) {
            return s;
        }
        const v = this.getter(this.wrappedKey(key));
        if (v) {
            let parsed: Entry<K, V>;
            try {
                parsed = Entry.fromJson<K, V>(key, JSON.parse(v));
            } catch (e) {
                // Corrupt or foreign data in the backing store - drop it instead of throwing
                this.deleter(this.wrappedKey(key));
                return undefined;
            }
            if (parsed.isExpired(this.options)) {
                // A restored entry can be older than the cache itself, so it has to be
                // checked here too - otherwise expired values would live on forever
                this.deleter(this.wrappedKey(key));
                return undefined;
            }
            this.putEntry(key, parsed);
            return parsed;
        }
        return undefined;
    }

    protected putEntry(key: K, entry: Entry<K, V>) {
        super.putEntry(key, entry);
        this.setter(this.wrappedKey(key), JSON.stringify(entry));
    }

    protected invalidateEntry(key: K): boolean {
        this.deleter(this.wrappedKey(key));
        return super.invalidateEntry(key);
    }

    invalidateAll(): void;
    invalidateAll(keys: Iterable<K>): void;
    invalidateAll(keys?: Iterable<K>): void {
        if (keys) {
            // Only drop the requested keys - invalidateEntry takes care of the backing store
            super.invalidateAll(keys);
            return;
        }
        super.invalidateAll();
        if (this.allDeleter) {
            this.allDeleter();
        }
    }

    /**
     * Key as used in the wrapped store.<br/>
     * Kept as JSON so previously persisted entries stay readable.
     */
    protected wrappedKey(key: K): string {
        return JSON.stringify(key);
    }

}
