import { should } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { Caches, AsyncLoadingCache, CacheStats } from "../src";
import { Time } from "@inventivetalent/time";

chai.use(chaiAsPromised);
should();

describe("AsyncLoadingCache<string, string>", function () {
    let cache: AsyncLoadingCache<string, string>;
    describe("#init", function () {
        this.timeout(5);
        it("should create a new cache with options", function () {
            cache = Caches.builder()
                .expireAfterAccess(Time.seconds(5))
                .expireAfterWrite(Time.seconds(5))
                .expirationInterval(Time.millis(500))
                .buildAsync(key => new Promise<string>(resolve => {
                    setTimeout(() => {
                        resolve(key + "a479646163796461");
                    }, 100 + Math.random() * 100);
                }));
            console.log(cache.options)
            cache.options.expireAfterAccess.should.equal(5000);
            cache.options.expireAfterWrite.should.equal(5000);
            cache.options.expirationInterval.should.equal(500);
            cache.options.deleteOnExpiration.should.be.true;
        });
    });
    describe("#events", function () {
        it("should emit 'stat' events", function () {
            cache.on("stat", function (stat, amount) {
                console.log("[stat] " + stat + " " + amount);
            });
            cache.on("expire", function (k, v) {
                console.log('[expire]', k, v);
            });
        });
    });
    describe("#put", function () {
        this.timeout(5);
        it("should put new entries", function () {
            cache.put("a", "1746161");
            cache.put("b", "5616148");

            cache.putAll(new Map<string, string>([["x", "6189749"], ["y", "1619849"]]));

            console.log(cache.keys())
        });
    });
    describe("#get-present", function () {
        this.timeout(10);
        it("should get existing entries quickly  #1", function () {
            let a = cache.getIfPresent("a"); // HIT
            a.should.be.a("Promise");
            return Promise.all([
                a.should.be.fulfilled,
                a.should.eventually.equal("1746161")
            ])
        });
        it("should get existing entries quickly #2", function () {
            let x = cache.getIfPresent("x"); // HIT
            x.should.be.a("Promise");
            return Promise.all([
                x.should.be.fulfilled,
                x.should.eventually.equal("6189749")
            ])
        });
        it("should get existing entries quickly #3", function () {
            let mapPromise = cache.getAllPresent(["b", "y"]); // 2xHIT
            mapPromise.should.be.a("Promise");
            return Promise.all([
                mapPromise.should.be.fulfilled,
                mapPromise.then(map => {
                    map.should.be.a("Map");
                    map.size.should.equal(2);
                    map.get("b").should.equal("5616148");
                    map.get("y").should.equal("1619849");
                })
            ])
        });
    });
    describe("#get-sync-load", function () {
        this.timeout(10);
        it("should get new values using sync mapping function #1", function () {
            let d = cache.get("d", k => k + "9191987");// MISS
            d.should.be.a("Promise");
            return d.should.eventually.equal("d9191987");
        });
        it("should get new values using sync mapping function #2", function () {
            let e = cache.get("e", k => k + "6519849");// MISS
            e.should.be.a("Promise");
            return e.should.eventually.equal("e6519849");
        });
    });
    describe("#get-async-load", function () {
        this.timeout(1000);
        it("should get new values using async mapping function #1", function () {
            let k = cache.get("k", k => {
                return new Promise<string>(resolve => {
                    setTimeout(() => {
                        resolve(k + "0641984916");
                    }, 400);
                })
            });// MISS
            k.should.be.a("Promise")
            return k.should.eventually.equal("k0641984916");
        });
        it("should get new values using async mapping function #2", function () {
            let l = cache.get("l", k => {
                return new Promise<string>(resolve => {
                    setTimeout(() => {
                        resolve(k + "1784416");
                    }, 400);
                })
            });// MISS
            l.should.be.a("Promise");
            return l.should.eventually.equal("l1784416");
        });
    });
    describe("#load", function () {
        this.timeout(2000);
        it("should load new values from async loader #1", function () {
            let h = cache.get("h");// MISS
            h.should.be.a("Promise");
            return h.should.eventually.equal("ha479646163796461");
        });
        it("should load new values from async loader #2", function () {
            let i = cache.get("i"); // MISS
            i.should.be.a("Promise");
            return i.should.eventually.equal("ia479646163796461");
        });
    });
    describe("#load-after-all", function () {
        this.timeout(2000);
        it("should start loading after calling getAll", function () {
            this.timeout(500)
            console.log(cache.keys())
            console.log('getAll')
            let r = cache.getAll(["o", "p", "q"]); // MISS
            console.log(r);

            console.log('get-after-getAll')
            let q = cache.get("q"); // HIT
            console.log(q);

            r.should.be.a("Promise");
            q.should.be.a("Promise");
            setTimeout(() => {
                console.log(r);
                console.log(q);
            }, 250);
            return Promise.all([
                r.should.be.fulfilled,
                r.should.become(new Map([["o", "oa479646163796461"],[ "p", "pa479646163796461"], ["q", "qa479646163796461"]])),
                r.should.be.fulfilled,
                q.should.become("qa479646163796461")
            ])
        });
        it("should not load after calling getAll again", function () {
            this.timeout(10)
            console.log(cache.keys())
            console.log('getAll')
            let r = cache.getAll(["o", "p", "q"]); // HIT
            console.log(r);
            r.should.be.a("Promise");
            return Promise.all([
                r.should.be.fulfilled,
                r.should.become(new Map([["o", "oa479646163796461"],[ "p", "pa479646163796461"], ["q", "qa479646163796461"]]))
            ])
        });
        it("should not load again after calling getAll #1", function () {
            this.timeout(10)
            console.log('getIfPresent')
            let b = cache.getIfPresent("o"); // HIT
            console.log(b)
            b.should.be.a("Promise");
            return Promise.all([
                b.should.be.fulfilled,
                b.should.become("oa479646163796461")
            ]);
        });
        it("should not load again after calling getAll #2", function () {
            this.timeout(10)
            console.log('get')
            let y = cache.get("p"); // HIT
            console.log(y)
            y.should.be.a("Promise");
            return Promise.all([
                y.should.be.fulfilled,
                y.should.become("pa479646163796461")
            ])
        });
        it("should not load again after calling getAll #3", function () {
            this.timeout(10)
            console.log('get')
            let y = cache.get("q"); // HIT
            console.log(y)
            y.should.be.a("Promise");
            return Promise.all([
                y.should.be.fulfilled,
                y.should.become("qa479646163796461")
            ]);
        });
    });
    describe("#keys", function () {
        it("should contain 13 keys", function () {
            console.log(cache.keys())
            cache.keys().should.eql(["a", "b", "x", "y", "d", "e", "k", "l", "h", "i", "o", "p", "q"]);
            setTimeout(()=>{
                console.log(cache.keys())
            },1000)
        });
    });
    describe("#expiration", function () {
        this.timeout(7000);
        it("should emit 'expire' event on expiration", function (done) {
            let c = 0;
            cache.on("expire", function (k, v) {
                c++;
            });
            setTimeout(function () {
                console.log('expired', c);
                c.should.equal(13);
                done();
            }, 6000);
        });
        it("should expire entries after 5 seconds", function (done) {
            setTimeout(function () {
                cache.keys().length.should.equal(0);
                done();
            }, 500);
        });
    });
    describe("#stats", function () {
        it("should count hits", function () {
            cache.stats.get(CacheStats.HIT).should.equal(11); // excluding the loads
        });
        it("should count misses", function () {
            cache.stats.get(CacheStats.MISS).should.equal(12);
        });
        it("should count expirations", function () {
            cache.stats.get(CacheStats.EXPIRE).should.equal(13);
        });
        it("should count loads", function () {
            cache.stats.get(CacheStats.LOAD_SUCCESS).should.equal(9);
        });
    });

    describe("#end", function () {
        it("should end", function () {
            cache.end();
        });
    });
});
