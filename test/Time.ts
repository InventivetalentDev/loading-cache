import { should } from 'chai';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { Time } from "../src/util/Time";

chai.use(chaiAsPromised);
should();

describe("Time", function () {
    it("should convert milliseconds", function () {
        Time.millis(100).should.equal(100);
    });
    it("should convert seconds", function () {
        Time.seconds(2).should.equal(2000);
    });
    it("should convert minutes", function () {
        Time.minutes(5).should.equal(300000);
    });
    it("should convert hours", function () {
        Time.hours(1).should.equal(3.6e+6);
    });
});
