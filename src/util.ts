export function asArray<K>(iterable: Iterable<K>): Array<K> {
    if (iterable instanceof Array) {
        return iterable as Array<K>;
    }
    return Array.from(iterable);
}

export function keyPromiseMapToPromiseContainingMap<K, V>(keyToPromiseMap: Map<K, Promise<V>>): Promise<Map<K, V>> {
    return new Promise<Map<K, V>>(resolve => {
        const keys = keyToPromiseMap.keys();
        const values = keyToPromiseMap.values();
        Promise.all(values).then(resolvedValues => {
            const valueMap = new Map<K, V>();
            let i = 0;
            // The promises *should* be in the original order of the map
            for (let key of keys) {
                let promise = resolvedValues[i++];
                valueMap.set(key, promise);
            }
            resolve(valueMap);
        })
    })
}

export class CompletablePromise<T> {

    private readonly _promise: Promise<T>;
    private _resolve: (value?: T | PromiseLike<T>) => void;
    private _reject: (reason?: any) => void;

    private _resolved = false;

    constructor() {
        this._promise = new Promise<T>((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }

    get promise(): Promise<T> {
        return this._promise;
    }

    resolve(value?: T | PromiseLike<T>): void {
        if (this._resolved) {
            throw new Error("Promise already resolved");
        }
        this._resolve(value);
        this._resolved = true;
    }

    reject(reason?: any): void {
        if (this._resolved) {
            throw new Error("Promise already resolved");
        }
        this._reject(reason);
        this._resolved = true;
    }

}
