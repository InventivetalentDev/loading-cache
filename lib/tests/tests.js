"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("../src");
const chai_1 = require("chai");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai_1.should();
describe("Sync Loading CacheBase Tests", function () {
    let cache;
    describe("#init", function () {
        it("should create a LoadingCache", function () {
            cache = new src_1.LoadingCache({}, key => {
                return "loadedValue";
            });
            cache.should.not.be.undefined;
        });
    });
    describe("#set", function () {
        it("should set values", function () {
            cache.set("setKey", "setValue").should.be.true;
        });
    });
    describe("#get", function () {
        it("should get existing values", function () {
            cache.getIfPresent("setKey").should.be.equal("setValue");
            cache.get("setKey").should.be.equal("setValue");
        });
    });
    describe("#load", function () {
        it("should load new values", function () {
            chai_1.expect(cache.getIfPresent("newKey")).to.be.undefined;
            cache.get("newKey").should.equal("loadedValue");
            cache.getIfPresent("newKey").should.equal("loadedValue");
        });
    });
    describe("#keys", function () {
        it("should contain two keys", function () {
            cache.keys().should.eql(['setKey', 'newKey']);
        });
    });
});
//TODO: tests for multi-get/multi-load
describe("Async Loading CacheBase Tests", function () {
    let cache;
    describe("#init", function () {
        it("should create a AsyncLoadingCache", function () {
            cache = new src_1.AsyncLoadingCache({}, key => {
                return new Promise(resolve => {
                    setTimeout(function () {
                        resolve("loadedValue");
                    }, 500 + Math.random() * 100);
                });
            });
            cache.should.not.be.undefined;
        });
    });
    describe("#setResolved", function () {
        it("should set values", function () {
            cache.setResolved("setKey", "setValue").should.be.true;
        });
    });
    describe("#getExisting", function () {
        this.timeout(1);
        it("should get existing values & resolve immediately", function () {
            return Promise.all([
                cache.getIfPresent("setKey").should.eventually.equal("setValue"),
                cache.get("setKey").should.eventually.equal("setValue")
            ]);
        });
    });
    describe("#load", function () {
        this.timeout(1500);
        it("should load new values in less than 1500ms", function () {
            return Promise.all([
                chai_1.expect(cache.getIfPresent("newKey")).to.be.undefined,
                cache.get("newKey").should.eventually.equal("loadedValue"),
                cache.getIfPresent("newKey").should.eventually.equal("loadedValue")
            ]);
        });
    });
    describe("#keys", function () {
        it("should contain two keys", function () {
            cache.keys().should.eql(['setKey', 'newKey']);
        });
    });
});
//TODO: tests for multi-get/multi-load
//# sourceMappingURL=tests.js.map
