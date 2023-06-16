import {
    DateTimepicker,
    Middleware,
    MultiUsersSelect,
    PlainTextInput,
    SlackCommandMiddlewareArgs,
    StaticSelect,
} from "@slack/bolt";
import { StringIndexed } from "@slack/bolt/dist/types/helpers";

export type Fields = {
    name: string;
    importance: string;
    desc: string;
    due_date: string;
};

// input fields for agenda items (including assignees)
export type Inputs = Fields & {
    assignees: string[];
};

// storage schema for redis db
export type Schema = Fields & {
    time: string; // ISO string representing insertion time
};

export type AgendaItem = Schema & {
    assignees: string[];
};

export type FieldInputMap = {
    name: PlainTextInput;
    importance: StaticSelect;
    desc: PlainTextInput;
    due_date: DateTimepicker;
    assignees: MultiUsersSelect;
};

export type UpdateData = {
    item: string;
    field: keyof Inputs;
    channel: string;
    sender: string;
};

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
    MAX = 3,
}

export type CommandListener = Middleware<SlackCommandMiddlewareArgs, StringIndexed>

export function isValidImportance(
    importance: string
): importance is keyof typeof Importance {
    return Object.keys(Importance).includes(importance);
}

export function isValidField(field: string): field is keyof Inputs {
    return (
        field === "name" ||
        field === "desc" ||
        field === "importance" ||
        field === "due_date" ||
        field === "assignees"
    );
}

export function fromStr(iName: keyof typeof Importance): Importance {
    return Importance[iName];
}