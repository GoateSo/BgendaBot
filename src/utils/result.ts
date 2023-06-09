import { Left, Right } from "fp-ts/lib/Either"

// warpper over either w/ string as error type and new names
export type Succ<T> = Right<T>
export type Fail = Left<string>
export type Result<T> = Fail | Succ<T>


export function isSucc<T>(result: Result<T>): result is Succ<T> {
    return result._tag == "Right";
}

export function isFail<T>(result: Result<T>): result is Fail {
    return result._tag == "Left";
}