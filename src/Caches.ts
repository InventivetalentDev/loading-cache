import { AsyncLoader, AsyncMultiLoader, Loader, MultiLoader } from "./loaders";
import { AsyncLoadingCache, LoadingCache, Options, SimpleCache } from "./cache";

class CacheBuilder {

    private readonly options: Options = {};

    protected constructor() {
    }


    expireAfterAccess(expireAfterAccess: number): this {
        this.options.expireAfterAccess = expireAfterAccess;
        return this;
    }

    expireAfterWrite(expireAfterWrite: number): this {
        this.options.expireAfterWrite = expireAfterWrite;
        return this;
    }

    deleteOnExpiration(deleteOnExpiration: boolean): this {
        this.options.deleteOnExpiration = deleteOnExpiration;
        return this;
    }

    expirationInterval(expirationInterval: number): this {
        this.options.expirationInterval = expirationInterval;
        return this;
    }

    recordStats(recordStats: boolean): this {
        this.options.recordStats = recordStats;
        return this;
    }

    /////

    build<K, V>(): SimpleCache<K, V>;
    build<K, V>(loader: Loader<K, V>, multiLoader?: MultiLoader<K, V>): LoadingCache<K, V>;
    build<K, V>(loader?: Loader<K, V>, multiLoader?: MultiLoader<K, V>): SimpleCache<K, V> | LoadingCache<K, V> {
        if (typeof loader === "undefined") {
            return new SimpleCache<K, V>(this.options);
        }
        return new LoadingCache<K, V>(this.options, loader, multiLoader);
    }

    buildAsync<K, V>(): AsyncLoadingCache<K, V>;
    buildAsync<K, V>(loader: AsyncLoader<K, V>, multiLoader?: AsyncMultiLoader<K, V>): AsyncLoadingCache<K, V>;
    buildAsync<K, V>(loader?: AsyncLoader<K, V>, multiLoader?: AsyncMultiLoader<K, V>): AsyncLoadingCache<K, V> {
        return new AsyncLoadingCache<K, V>(this.options, loader, multiLoader);
    }

}

export class Caches extends CacheBuilder {

    private constructor() {
        super();
    }

    static builder(): CacheBuilder {
        return new CacheBuilder();
    }

}
