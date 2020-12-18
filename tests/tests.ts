import { AsyncLoadingCache, LoadingCache } from "../src";
import { expect, should } from 'chai';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
should();

describe("Sync Loading Cache Tests", function () {
    let cache: LoadingCache<string>;
    describe("#init", function () {
        it("should create a LoadingCache", function () {
            cache = new LoadingCache<string>({}, key => {
                return "loadedValue";
            });
            cache.should.not.be.undefined;
        })
    })
    describe("#set", function () {
        it("should set values", function () {
            cache.set("setKey", "setValue").should.be.true;
        })
    })
    describe("#get", function () {
        it("should get existing values", function () {
            cache.getIfPresent("setKey").should.be.equal("setValue");
            cache.get("setKey").should.be.equal("setValue");
        })
    })
    describe("#load", function () {
        it("should load new values", function () {
            expect(cache.getIfPresent("newKey")).to.be.undefined;
            cache.get("newKey").should.equal("loadedValue");
            cache.getIfPresent("newKey").should.equal("loadedValue");
        })
    })
    describe("#keys", function () {
        it("should contain two keys", function () {
            cache.keys().should.eql(['setKey', 'newKey']);
        })
    })
})
//TODO: tests for multi-get/multi-load

describe("Async Loading Cache Tests", function () {
    let cache: AsyncLoadingCache<string>;
    describe("#init", function () {
        it("should create a AsyncLoadingCache", function () {
            cache = new AsyncLoadingCache<string>({}, key => {
                return new Promise(resolve => {
                    setTimeout(function () {
                        resolve("loadedValue");
                    }, 500 + Math.random() * 100);
                });
            });
            cache.should.not.be.undefined;
        })
    })
    describe("#setResolved", function () {
        it("should set values", function () {
            cache.setResolved("setKey", "setValue").should.be.true;
        })
    })
    describe("#getExisting", function () {
        this.timeout(1);
        it("should get existing values & resolve immediately", function () {
            return Promise.all([
                cache.getIfPresent("setKey").should.eventually.equal("setValue"),
                cache.get("setKey").should.eventually.equal("setValue")
            ]);
        })
    })
    describe("#load", function () {
        this.timeout(1500);
        it("should load new values in less than 1500ms", function () {
            return Promise.all([
                expect(cache.getIfPresent("newKey")).to.be.undefined,
                cache.get("newKey").should.eventually.equal("loadedValue"),
                cache.getIfPresent("newKey").should.eventually.equal("loadedValue")
            ])
        });
    });
    describe("#keys", function () {
        it("should contain two keys", function () {
            cache.keys().should.eql(['setKey', 'newKey']);
        })
    })
});
//TODO: tests for multi-get/multi-load
