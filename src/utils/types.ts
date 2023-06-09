import { Left, Right } from "fp-ts/lib/Either"

// importance levels for agenda items, duplicates allowed for aliases
export enum Importance {
    // min/default/0    -- default/minimal importance
    MIN = 0,
    DEFAULT = 0,
    // lo/low/1         -- low importance
    LO = 1,
    LOW = 1,
    // med/medium/2     -- medium importance
    MED = 2,
    MEDIUM = 2,
    // hi/high/max/3    -- high importance
    HI = 3,
    HIGH = 3,
    MAX = 3
}

export function isValidImportance(importance: string): importance is keyof typeof Importance {
    return Object.keys(Importance).includes(importance);
}

export function fromStr(iName: keyof typeof Importance): Importance {
    return Importance[iName];
}

export type Schema = {
    name: string,
    time: string,
    importance: string,
    desc: string
}

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