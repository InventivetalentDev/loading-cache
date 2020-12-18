import { BaseCache } from "../base";
import { AsyncLoader, AsyncMultiLoader } from "../loaders";
import { Key, Options, ValueSetItem } from "node-cache";

export class AsyncLoadingCache<T> extends BaseCache<Promise<T>> {

    readonly loader: AsyncLoader<T>;
    readonly multiLoader: AsyncMultiLoader<T>;

    constructor(options: Options, loader: AsyncLoader<T>, multiLoader: AsyncMultiLoader<T> = null) {
        super(options);
        this.loader = loader;
        this.multiLoader = multiLoader;
    }

    getAsync(key: Key): Promise<T | undefined> {
        let cached = this.getIfPresent(key);
        if (typeof cached !== "undefined") {
            return cached;
        }
        if (this.loader !== undefined) {
            let loading = this.loader(key);
            super.set(key, loading);
            return loading;
        }
        return cached;
    }

    get(key: Key): Promise<T | undefined> {
        return this.getAsync(key);
    }

    getIfPresent(key: Key): Promise<T | undefined> | undefined {
        return super.get(key);
    }

    mgetAsyncLoading(keys: Key[]): { [p: string]: Promise<T> } {
        let cached = this.mgetIfPresent(keys);
        let missingKeys = keys.filter(k => !cached.hasOwnProperty(k));
        if (missingKeys.length <= 0) {
            return cached;
        }
        if (this.multiLoader !== undefined) {
            let loading: Promise<{ [p: string]: T }> = this.multiLoader(keys);
            let loadingPerKey: { [p: string]: Promise<T> } = {};
            for (let key of keys) {
                loadingPerKey[key] = loading.then(v => v[key]);
            }
            let set: ValueSetItem[] = [];
            for (let key of keys) {
                set.push({
                    key: key,
                    val: loadingPerKey[key]
                });
            }
            super.mset(set);
            return loadingPerKey;
        } else if (this.loader !== undefined) {
            let allLoading: { [key: string]: Promise<T> } = {};
            keys.forEach(k => {
                let loading = this.loader(k);
                super.set(k, loading);
                allLoading[k] = loading;
            });
            return allLoading;
        }
        return cached;
    }

    mgetAsync(keys: Key[]): Promise<{ [p: string]: T }> {
        let loading: { [p: string]: Promise<T> } = this.mgetAsyncLoading(keys);
        return Promise.all(Object.values(loading))
            .then(loaded => {
                let loadingKeys: string[] = Object.keys(loading);
                let loadedMap: { [p: string]: T } = {};
                for (let i = 0; i < loadingKeys.length; i++) {
                    loadedMap[loadingKeys[i]] = loaded[i];
                }
                return loadedMap;
            });
    }

    mget(keys: Key[]): { [p: string]: Promise<T> } {
        return super.mget(keys);
    }

    mgetIfPresent(keys: Key[]): { [p: string]: Promise<T> } {
        return super.mget(keys);
    }

    set(key: Key, value: Promise<T>, ttl: number | string = null): boolean {
        return super.set(key, value, ttl);
    }

    setResolved(key: Key, value: T, ttl: number | string = null): boolean {
        return super.set(key, Promise.resolve(value), ttl);
    }

}

