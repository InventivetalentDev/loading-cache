"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Time = void 0;
class Time {
    static millis(m) {
        return m;
    }
    static seconds(s) {
        return this.millis(s / 1000);
    }
    static minutes(m) {
        return this.seconds(m / 60);
    }
    static hours(h) {
        return this.minutes(h / 60);
    }
    static get now() {
        return Date.now();
    }
}
exports.Time = Time;
//# sourceMappingURL=Time.js.map