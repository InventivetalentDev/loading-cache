import { BaseCache } from "../base";
import { Loader, MultiLoader } from "../loaders";
import { Key, Options, ValueSetItem } from "node-cache";

export class LoadingCache<T> extends BaseCache<T> {

    readonly loader: Loader<T>;
    readonly multiLoader: MultiLoader<T>;

    constructor(options: Options, loader: Loader<T>, multiLoader: MultiLoader<T> = null) {
        super(options);
        this.loader = loader;
        this.multiLoader = multiLoader;
    }

    get(key: Key): T | undefined {
        let cached = this.getIfPresent(key);
        if (typeof cached !== "undefined") {
            return cached;
        }
        if (this.loader !== undefined) {
            let loaded = this.loader(key);
            super.set(key, loaded);
            return loaded;
        }
        return cached;
    }

    getIfPresent(key: Key): T | undefined {
        return super.get(key);
    }

    mget(keys: Key[]): { [p: string]: T } {
        let cached = this.mgetIfPresent(keys);
        let missingKeys = keys.filter(k => !cached.hasOwnProperty(k));
        if (missingKeys.length <= 0) {
            return cached;
        }
        if (this.multiLoader !== undefined) {
            let loaded = this.multiLoader(keys);
            let set: ValueSetItem[] = [];
            for (let k in loaded) {
                set.push({
                    key: k,
                    val: loaded[k]
                });
            }
            super.mset(set);
            return loaded;
        } else if (this.loader !== undefined) {
            let allLoaded: { [key: string]: T } = {};
            keys.forEach(k => {
                let loaded = this.loader(k);
                super.set(k, loaded);
                allLoaded[k] = loaded;
            });
            return allLoaded;
        }
        return cached;
    }

    mgetIfPresent(keys: Key[]): { [p: string]: T } {
        return super.mget(keys);
    }

    set(key: Key, value: T): boolean {
        return super.set(key, value);
    }

    mset(keyValueSet: ValueSetItem<T>[]): boolean {
        return super.mset(keyValueSet);
    }

}
