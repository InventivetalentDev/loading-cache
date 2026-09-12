import { should } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { Caches, CacheStats, LoadingCache } from "../src";
import { Time } from "@inventivetalent/time";

chai.use(chaiAsPromised);
should();

describe("LoadingCache<string, string>", function () {
    let cache: LoadingCache<string, string>;
    const expiredKeys: string[] = [];
    let allExpired: Promise<void>;
    describe("#init", function () {
        this.timeout(5);
        it("should create a new cache with options", function () {
            cache = Caches.builder()
                .expireAfterAccess(Time.seconds(1))
                .expireAfterWrite(Time.seconds(1))
                .expirationInterval(Time.millis(500))
                .build(key => key + "l548994616");
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
        it("should register the 'expire' listener before anything can expire", function () {
            allExpired = new Promise<void>(resolve => {
                cache.on("expire", function (k, v) {
                    expiredKeys.push(k);
                    if (expiredKeys.length >= 8) {
                        resolve();
                    }
                });
            });
        });
    });
    describe("#put", function () {
        this.timeout(5);
        it("should put new entries", function () {
            cache.put("a", "12345");
            cache.put("b", "5134676");

            cache.putAll(new Map<string, string>([["x", "61689646"], ["y", "14946"]]));
        });
    });
    describe("#get", function () {
        this.timeout(10);
        it("should get existing entries", function () {
            cache.getIfPresent("a").should.equal("12345"); // HIT
            cache.getIfPresent("x").should.equal("61689646"); // HIT

            let map = cache.getAllPresent(["b", "y"]); // 2xHIT
            map.should.be.a("Map");
            map.size.should.equal(2);
            map.get("b").should.equal("5134676");
            map.get("y").should.equal("14946");
        });
        it("should get new values using mapping function", function () {
            cache.get("d", k => k + "494161").should.equal("d494161"); // MISS
            cache.get("e", k => k + "196160").should.equal("e196160"); // MISS
        });
    });
    describe("#load", function () {
        this.timeout(10);
        it("should load new values from loader", function () {
            cache.get("h").should.equal("hl548994616"); // MISS
            cache.get("i").should.equal("il548994616"); // MISS
        });
    });
    describe("#keys", function () {
        this.timeout(5);
        it("should contain 8 keys", function () {
            cache.keys().should.eql(["a", "b", "x", "y", "d", "e", "h", "i"]);
        });
    });
    describe("#expiration", function () {
        this.timeout(5000);
        // Waiting for the events rather than asserting at a fixed deadline - the assertion
        // would otherwise race the cache's own cleanup interval
        it("should emit 'expire' event on expiration", function () {
            return allExpired.then(() => {
                expiredKeys.should.have.members(["a", "b", "x", "y", "d", "e", "h", "i"]);
            });
        });
        it("should expire entries after 1 second", function () {
            cache.keys().length.should.equal(0);
        });
    });
    describe("#stats", function () {
        it("should count hits", function () {
            cache.stats.get(CacheStats.HIT).should.equal(4); // excluding the loads
        });
        it("should count misses", function () {
            cache.stats.get(CacheStats.MISS).should.equal(4);
        });
        it("should count expirations", function () {
            cache.stats.get(CacheStats.EXPIRE).should.equal(8);
        });
        it("should count loads", function () {
            cache.stats.get(CacheStats.LOAD_SUCCESS).should.equal(4);
        });
    });

    describe("#end", function () {
        it("should end", function () {
            cache.end();
        });
    });
});
