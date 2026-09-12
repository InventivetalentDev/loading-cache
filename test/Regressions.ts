import * as chai from 'chai';
import { should } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { Caches, CacheStats, SimpleCache, WrappedCache } from "../src";
import { CompletablePromise } from "../src/util";
import { Time } from "@inventivetalent/time";

chai.use(chaiAsPromised);
should();

const expect = chai.expect;

/**
 * Asserts the value is there and narrows it, so strict-mode tests can keep chaining
 */
function present<T>(value: T | undefined): T {
    expect(value, "expected a value to be present").to.not.be.undefined;
    return value as T;
}

describe("regressions", function () {

    describe("falsy values", function () {
        it("should cache a loaded 0 instead of reloading it", function () {
            let calls = 0;
            const cache = Caches.builder().build<string, number>();
            const loader = () => {
                calls++;
                return 0;
            };
            expect(cache.get("k", loader)).to.equal(0);
            expect(cache.get("k", loader)).to.equal(0);
            calls.should.equal(1);
            cache.has("k").should.be.true;
            cache.stats.get(CacheStats.LOAD_FAIL).should.equal(0);
            cache.stats.get(CacheStats.LOAD_SUCCESS).should.equal(1);
            cache.end();
        });

        it("should cache empty strings and false", function () {
            const cache = Caches.builder().build<string, any>();
            cache.put("empty", "");
            cache.put("false", false);
            expect(cache.getIfPresent("empty")).to.equal("");
            expect(cache.getIfPresent("false")).to.equal(false);
            cache.end();
        });

        it("should not re-invoke a LoadingCache loader for falsy cached values", function () {
            let calls = 0;
            const cache = Caches.builder().build<string, string>(() => {
                calls++;
                return "";
            });
            cache.get("a");
            cache.get("a");
            cache.get("a");
            calls.should.equal(1);
            cache.end();
        });

        it("should treat undefined as a failed load", function () {
            const cache = Caches.builder().build<string, string>();
            expect(cache.get("k", () => undefined)).to.be.undefined;
            cache.has("k").should.be.false;
            cache.stats.get(CacheStats.LOAD_FAIL).should.equal(1);
            cache.end();
        });
    });

    describe("async load failures", function () {
        it("should not cache a rejected load, so the next get retries", async function () {
            let attempts = 0;
            const cache = Caches.builder().buildAsync<string, string>(async () => {
                attempts++;
                if (attempts === 1) {
                    throw new Error("transient");
                }
                return "recovered";
            });

            await cache.get("k").should.be.rejectedWith("transient");
            // let the rejection handler evict the entry
            await new Promise(resolve => setTimeout(resolve, 10));
            cache.has("k").should.be.false;

            await cache.get("k").should.eventually.equal("recovered");
            attempts.should.equal(2);
            cache.end();
        });

        it("should not produce unhandled rejections for failed loads", async function () {
            const unhandled: any[] = [];
            const listener = (reason: any) => unhandled.push(reason);
            process.on("unhandledRejection", listener);
            try {
                const cache = Caches.builder().buildAsync<string, string>(async () => {
                    throw new Error("nope");
                });
                // nobody ever awaits this one
                cache.get("never-awaited");
                await new Promise(resolve => setTimeout(resolve, 50));
                cache.end();
            } finally {
                process.off("unhandledRejection", listener);
            }
            unhandled.should.be.empty;
        });

        it("should record a failed async load as LOAD_FAIL", async function () {
            const cache = Caches.builder().buildAsync<string, string>(async () => {
                throw new Error("nope");
            });
            await cache.get("k").should.be.rejected;
            await new Promise(resolve => setTimeout(resolve, 10));
            cache.stats.get(CacheStats.LOAD_FAIL).should.equal(1);
            cache.stats.get(CacheStats.LOAD_SUCCESS).should.equal(0);
            cache.end();
        });
    });

    describe("async getAll", function () {
        it("should only pass missing keys to the multi loader", async function () {
            const received: string[][] = [];
            const cache = Caches.builder().buildAsync<string, string>(
                async k => "v" + k,
                async keys => {
                    received.push([...keys]);
                    return new Map(keys.map(k => [k, "v" + k] as [string, string]));
                }
            );
            await cache.getAll(["a", "b"]);
            await cache.getAll(["a", "b", "c"]);
            received.should.eql([["a", "b"], ["c"]]);
            cache.end();
        });

        it("should not leave entries pending when the loader rejects", async function () {
            const cache = Caches.builder().buildAsync<string, string>(
                async () => "v",
                async () => {
                    throw new Error("multi loader failed");
                }
            );
            await cache.getAll(["a", "b"]).should.be.rejectedWith("multi loader failed");
            cache.keys().should.be.empty;

            // whatever was handed out earlier must settle rather than hang forever
            const cache2 = Caches.builder().buildAsync<string, string>(
                async () => "v",
                async () => {
                    throw new Error("multi loader failed");
                }
            );
            const all = cache2.getAll(["a"]);
            const handedOut = present(cache2.getIfPresent("a"));
            await all.should.be.rejected;
            await handedOut.should.be.rejectedWith("multi loader failed");
            cache2.end();
            cache.end();
        });

        it("should not load a duplicated key twice", async function () {
            const received: string[][] = [];
            const cache = Caches.builder().buildAsync<string, string>(
                async k => "v" + k,
                async keys => {
                    received.push([...keys]);
                    return new Map(keys.map(k => [k, "v" + k] as [string, string]));
                }
            );
            const result = await cache.getAll(["a", "a", "b"]);
            received.should.eql([["a", "b"]]);
            result.size.should.equal(2);
            cache.stats.get(CacheStats.LOAD_FAIL).should.equal(0);
            cache.end();
        });

        it("should not cache keys the loader returned no value for", async function () {
            const cache = Caches.builder().buildAsync<string, string>(
                async () => "v",
                async () => new Map([["a", "va"]])
            );
            const result = await cache.getAll(["a", "b"]);
            present(result.get("a")).should.equal("va");
            cache.has("a").should.be.true;
            cache.has("b").should.be.false;
            cache.stats.get(CacheStats.LOAD_FAIL).should.equal(1);
            cache.end();
        });
    });

    describe("WrappedCache", function () {
        function wrapped(options = {}) {
            const store = new Map<string, string>();
            const cache = new WrappedCache<string, string>(
                { expirationInterval: 0, ...options },
                k => store.get(k) ?? null,
                (k, v) => void store.set(k, v),
                k => store.delete(k),
                () => store.clear()
            );
            return { store, cache };
        }

        it("should not resurrect expired entries from the backing store", async function () {
            const { store, cache } = wrapped({ expireAfterWrite: Time.millis(50), expirationInterval: Time.millis(20) });
            cache.put("a", "value");
            await new Promise(resolve => setTimeout(resolve, 200));
            expect(cache.getIfPresent("a")).to.be.undefined;
            store.size.should.equal(0);
            cache.end();
        });

        it("should clear the backing store when the cleanup timer expires entries", async function () {
            const { store, cache } = wrapped({ expireAfterWrite: Time.millis(50), expirationInterval: Time.millis(20) });
            cache.put("a", "value");
            store.size.should.equal(1);
            await new Promise(resolve => setTimeout(resolve, 200));
            store.size.should.equal(0);
            cache.end();
        });

        it("should only invalidate the given keys", function () {
            const { store, cache } = wrapped();
            cache.put("keep", "1");
            cache.put("drop", "2");
            cache.invalidateAll(["drop"]);
            cache.keys().should.eql(["keep"]);
            expect(cache.getIfPresent("keep")).to.equal("1");
            store.size.should.equal(1);
            cache.end();
        });

        it("should still clear everything without keys", function () {
            const { store, cache } = wrapped();
            cache.put("keep", "1");
            cache.put("drop", "2");
            cache.invalidateAll();
            cache.keys().should.be.empty;
            store.size.should.equal(0);
            cache.end();
        });

        it("should report persisted entries from has() after a restart", function () {
            const store = new Map<string, string>();
            const make = () => new WrappedCache<string, string>({ expirationInterval: 0 },
                k => store.get(k) ?? null,
                (k, v) => void store.set(k, v),
                k => store.delete(k),
                () => store.clear());

            const first = make();
            first.put("a", "persisted");
            first.end();

            // fresh instance: nothing in memory, entry still in the wrapped store
            const restarted = make();
            restarted.has("a").should.be.true;
            expect(restarted.getIfPresent("a")).to.equal("persisted");
            restarted.end();
        });

        it("should not report expired persisted entries from has()", async function () {
            const store = new Map<string, string>();
            const make = () => new WrappedCache<string, string>(
                { expirationInterval: 0, expireAfterWrite: Time.millis(30) },
                k => store.get(k) ?? null,
                (k, v) => void store.set(k, v),
                k => store.delete(k),
                () => store.clear());

            const first = make();
            first.put("a", "persisted");
            first.end();
            await new Promise(resolve => setTimeout(resolve, 60));

            const restarted = make();
            restarted.has("a").should.be.false;
            expect(restarted.getIfPresent("a")).to.be.undefined;
            restarted.end();
        });

        it("should survive corrupt data in the backing store", function () {
            const { store, cache } = wrapped();
            store.set(JSON.stringify("bad"), "{not json");
            expect(cache.getIfPresent("bad")).to.be.undefined;
            cache.end();
        });
    });

    describe("strict typing", function () {
        it("should return a promise even when nothing can load the key", async function () {
            // no loader and no mapping function - a bare undefined return would make
            // cache.get(key).then(...) throw
            const cache = Caches.builder().buildAsync<string, string>();
            const result = cache.get("nope");
            expect(result).to.be.a("Promise");
            expect(await result).to.be.undefined;
            cache.end();
        });

        it("should not blow up when a sync mapping function returns nothing", function () {
            const cache = Caches.builder().build<string, string>();
            const result = cache.getAll(["a", "b"], () => undefined);
            result.should.be.a("Map");
            result.size.should.equal(0);
            cache.keys().should.be.empty;
            cache.stats.get(CacheStats.LOAD_FAIL).should.equal(2);
            cache.end();
        });

        it("should not blow up when an async mapping function returns nothing", async function () {
            const cache = Caches.builder().buildAsync<string, string>();
            const result = await cache.getAll(["a", "b"], async () => undefined);
            result.size.should.equal(0);
            cache.keys().should.be.empty;
            cache.stats.get(CacheStats.LOAD_FAIL).should.equal(2);
            cache.end();
        });

        it("should expose loaders as possibly absent", function () {
            const withLoader = Caches.builder().build<string, string>(k => k);
            const withoutLoader = Caches.builder().build<string, string>();
            expect(withLoader.loader).to.be.a("function");
            expect((withoutLoader as any).loader).to.be.undefined;
            withLoader.end();
            withoutLoader.end();
        });

        it("should fill in every option, ignoring explicit undefined", function () {
            const cache = new SimpleCache<string, string>({
                expireAfterWrite: undefined,
                recordStats: false
            });
            // an explicit undefined must not wipe out the default
            cache.options.expireAfterWrite.should.equal(0);
            cache.options.expirationInterval.should.equal(Time.minutes(5));
            cache.options.deleteOnExpiration.should.be.true;
            cache.options.recordStats.should.be.false;
            cache.end();
        });
    });

    describe("expiration visibility", function () {
        // deleteOnExpiration:false keeps expired entries in memory, which is the case
        // where has()/keys() can disagree with getIfPresent()
        function lingering() {
            return Caches.builder()
                .expireAfterWrite(Time.millis(30))
                .deleteOnExpiration(false)
                .expirationInterval(0)
                .build<string, string>();
        }

        it("should not report expired entries from has()", async function () {
            const cache = lingering();
            cache.put("a", "1");
            cache.has("a").should.be.true;
            await new Promise(resolve => setTimeout(resolve, 60));
            expect(cache.getIfPresent("a")).to.be.undefined;
            cache.has("a").should.be.false;
            cache.end();
        });

        it("should not list expired entries in keys()", async function () {
            const cache = lingering();
            cache.put("a", "1");
            cache.put("b", "2");
            cache.keys().should.have.members(["a", "b"]);
            await new Promise(resolve => setTimeout(resolve, 60));
            cache.keys().should.be.empty;
            cache.end();
        });

        it("should keep has() and keys() consistent with getIfPresent()", async function () {
            const cache = lingering();
            cache.put("old", "1");
            await new Promise(resolve => setTimeout(resolve, 60));
            cache.put("new", "2");
            cache.keys().should.eql(["new"]);
            cache.has("new").should.be.true;
            cache.has("old").should.be.false;
            expect(cache.getIfPresent("new")).to.equal("2");
            expect(cache.getIfPresent("old")).to.be.undefined;
            cache.end();
        });

        it("should still drop expired entries on invalidateAll()", async function () {
            // allKeys() is protected, so reach it through a subclass to check the
            // underlying map rather than the filtered view
            class Probe extends SimpleCache<string, string> {
                stored(): string[] {
                    return this.allKeys();
                }
            }
            const cache = new Probe({
                expireAfterWrite: Time.millis(30),
                deleteOnExpiration: false,
                expirationInterval: 0
            });
            cache.put("a", "1");
            cache.put("b", "2");
            await new Promise(resolve => setTimeout(resolve, 60));
            cache.stored().should.have.members(["a", "b"]);
            cache.invalidateAll();
            cache.stored().should.be.empty;
            cache.end();
        });

        it("should not record stats or extend entry lifetime", async function () {
            const cache = Caches.builder()
                .expireAfterAccess(Time.millis(60))
                .expirationInterval(0)
                .build<string, string>();
            cache.put("a", "1");
            // repeated has()/keys() must not keep the entry alive
            for (let i = 0; i < 4; i++) {
                cache.has("a");
                cache.keys();
                await new Promise(resolve => setTimeout(resolve, 25));
            }
            cache.has("a").should.be.false;
            cache.stats.get(CacheStats.HIT).should.equal(0);
            cache.stats.get(CacheStats.MISS).should.equal(0);
            cache.end();
        });

        it("should apply to LoadingCache and AsyncLoadingCache too", async function () {
            const loading = Caches.builder()
                .expireAfterWrite(Time.millis(30)).deleteOnExpiration(false).expirationInterval(0)
                .build<string, string>(k => k);
            const async = Caches.builder()
                .expireAfterWrite(Time.millis(30)).deleteOnExpiration(false).expirationInterval(0)
                .buildAsync<string, string>(async k => k);
            loading.put("a", "1");
            async.put("a", "1");
            await new Promise(resolve => setTimeout(resolve, 60));
            loading.has("a").should.be.false;
            loading.keys().should.be.empty;
            async.has("a").should.be.false;
            async.keys().should.be.empty;
            loading.end();
            async.end();
        });
    });

    describe("CompletablePromise", function () {
        it("should reject through then() without a rejection handler", async function () {
            const completable = new CompletablePromise<string>();
            completable.reject(new Error("boom"));
            await completable.then(v => v).should.be.rejectedWith("boom");
        });

        it("should resolve through catch() without a handler", async function () {
            const completable = CompletablePromise.completedPromise("ok");
            await completable.catch().should.eventually.equal("ok");
        });

        it("should ignore settling twice", async function () {
            const completable = new CompletablePromise<string>();
            completable.resolve("first");
            completable.resolve("second");
            completable.reject(new Error("late"));
            completable.settled.should.be.true;
            await completable.promise.should.eventually.equal("first");
        });
    });

    describe("CacheStats", function () {
        it("should serialise recorded stats", function () {
            const cache = Caches.builder().build<string, string>();
            cache.put("a", "b");
            cache.getIfPresent("a");
            cache.getIfPresent("nope");
            JSON.parse(cache.stats.toString()).should.eql({ hit: 1, miss: 1 });
            cache.stats.toObject().should.eql({ hit: 1, miss: 1 });
            cache.end();
        });
    });

    describe("cleanup timer", function () {
        it("should not keep a reference that blocks process exit", function () {
            const cache: SimpleCache<string, string> = Caches.builder()
                .expirationInterval(Time.millis(100))
                .build();
            // unref'd timers are not counted as active handles
            const handles: any[] = (process as any)._getActiveHandles();
            handles.some(h => h && h._idleTimeout === 100).should.be.false;
            cache.end();
        });
    });

});
