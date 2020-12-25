import { EventEmitter } from "events";

export interface ICacheEventEmitter extends EventEmitter {
    // @formatter:off

    on(event: "error", listener: (error: any) => void): this;
    on(event: "expire", listener: (key: any, value: any) => void): this;
    on(event: "stat", listener: (stat: string, incAmount: number, prevAmount: number) => void): this;

    once(event: "error", listener: (error: any) => void): this;
    once(event: "expire", listener: (key: any, value: any) => void): this;
    once(event: "stat", listener: (stat: string, incAmount: number, prevAmount: number) => void): this;

    off(event: "error", listener: (error: any) => void): this;
    off(event: "expire", listener: (key: any, value: any) => void): this;
    off(event: "stat", listener: (stat: string, incAmount: number, prevAmount: number) => void): this;

    emit(name: "error", error: any): boolean;
    emit(name: "expire", key: any, value: any): boolean;
    emit(name: "stat", stat: string, incAmount: number, prevAmount: number): boolean;

    // @formatter:on
}
