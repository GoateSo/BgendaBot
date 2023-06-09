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