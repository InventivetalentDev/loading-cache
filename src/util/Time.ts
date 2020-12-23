/**
 * Time utility class
 */
export class Time {

    static millis(m: number) {
        return m;
    }

    /**
     * Convert seconds to milliseconds
     */
    static seconds(s: number) {
        return this.millis(s * 1000);
    }

    /**
     * Convert minutes to milliseconds
     */
    static minutes(m: number) {
        return this.seconds(m * 60);
    }

    /**
     * Convert hours to milliseconds
     */
    static hours(h: number) {
        return this.minutes(h * 60);
    }

    /**
     * Get the current time in milliseconds
     */
    static get now(): number {
        return Date.now();
    }
}
