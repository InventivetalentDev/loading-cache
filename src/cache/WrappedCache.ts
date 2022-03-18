import { CacheBase, Entry, Options } from "./CacheBase";
import { ICache, ICacheEventEmitter } from "../interfaces";
import { MappingFunction } from "../loaders";
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
        const v = this.getter(JSON.stringify(key));
        if (v) {
            const parsed = Entry.fromJson<K, V>(key, JSON.parse(v));
            this.putEntry(key, parsed);
            return parsed;
        }
        return undefined;
    }

    protected putEntry(key: K, entry: Entry<K, V>) {
        super.putEntry(key, entry);
        this.setter(JSON.stringify(key), JSON.stringify(entry));
    }

    protected invalidateEntry(key: K): boolean {
        this.deleter(JSON.stringify(key));
        return super.invalidateEntry(key);
    }

    invalidateAll() {
        super.invalidateAll();
        if (this.allDeleter) {
            this.allDeleter();
        }
    }

}

