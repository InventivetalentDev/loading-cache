import { should } from 'chai';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { Caches, Time, AsyncLoadingCache, CacheStats } from "../src";

chai.use(chaiAsPromised);
should();

describe("AsyncLoadingCache<string, string>", function () {
    let cache: AsyncLoadingCache<string, string>;
    describe("#init", function () {
        this.timeout(5);
        it("should create a new cache with options", function () {
            cache = Caches.builder()
                .expireAfterAccess(Time.seconds(1))
                .expireAfterWrite(Time.seconds(1))
                .expirationInterval(Time.millis(500))
                .buildAsync(key => new Promise<string>(resolve => {
                    setTimeout(() => {
                        resolve(key + "a479646163796461");
                    }, 100 + Math.random() * 100);
                }));
            cache.options.expireAfterAccess.should.equal(1000);
            cache.options.expireAfterWrite.should.equal(1000);
            cache.options.expirationInterval.should.equal(500);
            cache.options.deleteOnExpiration.should.be.true;
        });
    });
    describe("#events", function () {
        it("should emit 'stat' events", function () {
            cache.on("stat", function (stat, amount) {
                console.log("[stat] " + stat + " " + amount);
            });
        });
    });
    describe("#put", function () {
        this.timeout(5);
        it("should put new entries", function () {
            cache.put("a", "1746161");
            cache.put("b", "5616148");

            cache.putAll(new Map<string, string>([["x", "6189749"], ["y", "1619849"]]));
        });
    });
    describe("#get-present", function () {
        this.timeout(10);
        it("should get existing entries quickly", function (done) {
            let a = cache.getIfPresent("a"); // HIT
            a.should.be.a("Promise");
            a.should.eventually.equal("1746161");

            let x = cache.getIfPresent("x"); // HIT
            x.should.be.a("Promise");
            x.should.eventually.equal("6189749");

            let mapPromise = cache.getAllPresent(["b", "y"]); // 2xHIT
            mapPromise.should.be.a("Promise");
            mapPromise.then(map => {
                map.should.be.a("Map");
                map.size.should.equal(2);
                map.get("b").should.equal("5616148");
                map.get("y").should.equal("1619849");

                done();
            });
        });
    });
    describe("#get-sync-load", function () {
        this.timeout(10);
        it("should get new values using sync mapping function", function () {
            let d = cache.get("d", k => k + "9191987");// MISS
            d.should.be.a("Promise");
            d.should.eventually.equal("d9191987");

            let e = cache.get("e", k => k + "6519849");// MISS
            e.should.be.a("Promise");
            e.should.eventually.equal("e6519849");
        });
    });
    describe("#get-async-load", function () {
        this.timeout(1000);
        it("should get new values using async mapping function", function () {
            let k = cache.get("k", k => {
                return new Promise<string>(resolve => {
                    setTimeout(() => {
                        resolve(k + "0641984916");
                    }, 400);
                })
            });// MISS
            k.should.be.a("Promise")
            k.should.eventually.equal("k0641984916");

            let l = cache.get("l", k => {
                return new Promise<string>(resolve => {
                    setTimeout(() => {
                        resolve(k + "1784416");
                    }, 400);
                })
            });// MISS
            l.should.be.a("Promise");
            l.should.eventually.equal("l1784416");
        });
    });
    describe("#load", function () {
        this.timeout(2000);
        it("should load new values from async loader", function () {
            let h = cache.get("h");// MISS
            h.should.be.a("Promise");
            h.should.eventually.equal("ha479646163796461");

            let i = cache.get("i"); // MISS
            i.should.be.a("Promise");
            i.should.eventually.equal("ia479646163796461");
        });
    });
    describe("#keys", function () {
        it("should contain 10 keys", function () {
            cache.keys().should.eql(["a", "b", "x", "y", "d", "e", "k", "l", "h", "i"]);
        });
    });
    describe("#expiration", function () {
        this.timeout(4500);
        it("should emit 'expire' event on expiration", function (done) {
            let c = 0;
            cache.on("expire", function (k, v) {
                c++;
            });
            setTimeout(function () {
                c.should.equal(10);
                done();
            }, 2000);
        });
        it("should expire entries after 1 second", function (done) {
            setTimeout(function () {
                cache.keys().length.should.equal(0);
                done();
            }, 2000);
        });
    });
    describe("#stats", function () {
        it("should count hits", function () {
            cache.stats.get(CacheStats.HIT).should.equal(4); // excluding the loads
        });
        it("should count misses", function () {
            cache.stats.get(CacheStats.MISS).should.equal(6);
        });
        it("should count expirations", function () {
            cache.stats.get(CacheStats.EXPIRE).should.equal(10);
        });
        it("should count loads", function () {
            cache.stats.get(CacheStats.LOAD_SUCCESS).should.equal(6);
        });
    });

    describe("#end", function () {
        it("should end", function () {
            cache.end();
        });
    });
});
