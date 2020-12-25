import { should } from 'chai';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { SimpleCache } from "../src/caches/SimpleCache";
import { Time } from "../src/util/Time";
import { CacheStats } from "../src/CacheStats";
import { CacheEvents } from "../src/CacheEvents";
import { Caches } from "../src";

chai.use(chaiAsPromised);
should();

describe("SimpleCache<string, string>", function () {
    let cache: SimpleCache<string, string>;
    describe("#init", function () {
        it("should create a new cache with options", function () {
            cache = Caches.builder()
                .expireAfterWrite(Time.seconds(1))
                .expireAfterAccess(Time.seconds(1))
                .expirationInterval(Time.millis(500))
                .build();
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
        it("should put new entries", function () {
            cache.put("a", "12345");
            cache.put("b", "5134676");

            cache.putAll(new Map<string, string>([["x", "1346"], ["y", "167867"]]));
        });
    });
    describe("#get", function () {
        it("should get existing entries", function () {
            cache.getIfPresent("a").should.equal("12345"); // HIT
            cache.getIfPresent("x").should.equal("1346"); // HIT

            let map = cache.getAllPresent(["b", "y"]); // 2xHIT
            map.should.be.a("Map");
            map.size.should.equal(2);
            map.get("b").should.equal("5134676");
            map.get("y").should.equal("167867");
        });
        it("should get new values using mapping function", function () {
            cache.get("d", k => k + "218979").should.equal("d218979"); // MISS
            cache.get("e", k => k + "168797").should.equal("e168797"); // MISS
        });
    });
    describe("#keys", function () {
        it("should contain 6 keys", function () {
            cache.keys().should.eql(["a", "b", "x", "y", "d", "e"]);
        });
    });
    describe("#expiration", function () {
        this.timeout(2000);
        it("should emit 'expire' event on expiration", function (done) {
            let c = 0;
            cache.on("expire", function (k, v) {
                c++;
            });
            setTimeout(function () {
                c.should.equal(6);
                done();
            }, 1500);
        });
        it("should expire entries after 1 second", function (done) {
            setTimeout(function () {
                cache.keys().length.should.equal(0);
                done();
            }, 1500);
        });
    });
    describe("#stats", function () {
        it("should count hits", function () {
            cache.stats.get(CacheStats.HIT).should.equal(4); // excluding the loads
        });
        it("should count misses", function () {
            cache.stats.get(CacheStats.MISS).should.equal(2);
        });
        it("should count expirations", function () {
            cache.stats.get(CacheStats.EXPIRE).should.equal(6);
        });
        it("should count loads", function () {
            cache.stats.get(CacheStats.LOAD_SUCCESS).should.equal(2);
        });
    });

    describe("#end", function () {
        it("should end", function () {
            cache.end();
        });
    });
});
