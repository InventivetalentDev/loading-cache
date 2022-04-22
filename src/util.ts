export function asArray<K>(iterable: Iterable<K>): Array<K> {
    if (iterable instanceof Array) {
        return iterable as Array<K>;
    }
    return Array.from(iterable);
}

export function keyCompletablePromiseMapToPromiseContainingMap<K, V>(keyToPromiseMap: Map<K, CompletablePromise<V>>): Promise<Map<K, V>> {
    return new Promise<Map<K, V>>(resolve => {
        const keys = keyToPromiseMap.keys();
        const values = asArray(keyToPromiseMap.values());
        Promise.all(values.map(p => p.promise)).then(resolvedValues => {
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

    static of<T>(value: Promise<T>): CompletablePromise<T> {
        const promise = new CompletablePromise<T>();
        value
            .then(v => promise.resolve(v))
            .catch(e => promise.reject(e));
        return promise;
    }

    static completedPromise<T>(value: T | PromiseLike<T>): CompletablePromise<T> {
        const completable = new CompletablePromise<T>();
        completable.resolve(value);
        return completable;
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

    then(fulfilled?: (value: T) => T | PromiseLike<T>, rejected?: (reason: any) => T | PromiseLike<T>): Promise<T> {
        return this._promise.then(v => fulfilled(v), e => rejected(e));
    }

    catch(rejected?: (reason: any) => T | PromiseLike<T>): Promise<T> {
        return this._promise.catch(e => rejected(e));
    }


}
