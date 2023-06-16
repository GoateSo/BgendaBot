export interface Succ<T> {
    readonly _tag: "Succ";
    readonly value: T;
}
export interface Fail {
    readonly _tag: "Fail";
    readonly reason: string;
}

export type Result<T> = Succ<T> | Fail;

export function succ<T>(value: T): Succ<T> {
    return { _tag: "Succ", value };
}

export function fail(reason: string): Fail {
    return { _tag: "Fail", reason };
}

export function succeeded<T>(result: Result<T>): result is Succ<T> {
    return result._tag == "Succ";
}

export function failed<T>(result: Result<T>): result is Fail {
    return result._tag == "Fail";
}
