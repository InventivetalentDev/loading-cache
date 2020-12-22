export class Time {

    static millis(m: number) {
        return m;
    }

    static seconds(s: number) {
        return this.millis(s * 1000);
    }

    static minutes(m: number) {
        return this.seconds(m * 60);
    }

    static hours(h: number) {
        return this.minutes(h * 60);
    }

    static get now(): number {
        return Date.now();
    }
}
