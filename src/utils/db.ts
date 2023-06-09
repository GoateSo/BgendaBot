import { createClient } from 'redis';
import { left as fail, right as succ } from 'fp-ts/lib/Either';
import { Importance, Schema, fromStr, isValidImportance, Result } from './types';

const client = createClient();

client.on('error', (err) => {
    console.error(err);
});

export async function connect() {
    if (!client.isOpen) await client.connect();
}

let cache: Schema[] = [];
let cacheDirty = true;

/**
 * check if the data has been updated since the last call to items(). When
 * removing or updating items, this should be checked before calling items()
 * to avoid accidently modifying wrong/already modified data.
 * @returns whether the data has been updated since the last call to items()
 */
export function isCacheDirty() {
    return cacheDirty;
}

async function items(): Promise<Schema[]> {
    // gets all items, sorts in order of importance and then in insertion order
    if (cacheDirty) {
        cache = [];
        for await (const name of client.scanIterator()) {
            const { time, importance, desc } = await client.hGetAll(name) as Schema;
            cache.push({ name, time, importance, desc });
        }
        cache.sort((a, b) => {
            const importanceA = parseInt(a.importance);
            const importanceB = parseInt(b.importance);
            if (importanceA == importanceB) {
                return a.time.localeCompare(b.time);
            } else {
                return importanceB - importanceA; // hi importance first
            }
        });
        cacheDirty = false;
    }
    return cache;
}

// uses importance as a proxy check for existence

/**
 * adds an item to the agenda
 * @param item item name to add
 * @param param1 optional importance and desc
 * @returns indication of success, or failure with message
 */
export async function add(item: string, { importance = Importance.DEFAULT, desc = "" } = {}): Promise<Result<void>> {
    await connect();
    // check if item already exists
    if (await client.hExists(item, "importance")) {
        return fail(`Item "${item}" already in agenda`);
    } else {
        // add item with default importance and desc, flag cache as dirty
        await client.hSet(item, {
            time: new Date().toISOString(),
            importance: importance,
            desc: desc
        });
        cacheDirty = true;
        return succ(undefined);
    }
}

// unused earlier version -- unified update command
/**
 * updates an agenda item with a new importance level or more info
 * @param item item to update
 * @param key field to update in item
 * @param newVal new value for field
 * @returns indiction of success, or failure with message
 */
export async function update(item: string, key: string, newVal: string): Promise<Result<void>> {
    await connect();
    // check if item exists
    if (!await client.hExists(item, "importance"))
        return fail(`Item "${item}" not in agenda`);
    // check if key is valid
    key = key.trim().toLowerCase();
    if (key !== "importance" && key !== "desc")
        return fail(`Invalid field "${key}"`);
    // change importance field  
    if (key === "importance") {
        newVal = newVal.trim().toUpperCase();
        if (isNaN(parseInt(newVal))) { // string importance
            if (!isValidImportance(newVal))
                return fail(`Invalid importance level "${newVal}"`);
            cacheDirty = true;
            await client.hSet(item, key, fromStr(newVal));
        } else { // direct numeric importance
            const n = parseInt(newVal);
            if (n < Importance.MIN || n > Importance.MAX)
                return fail(`Invalid importance level "${newVal}"`);
            cacheDirty = true;
            await client.hSet(item, key, n);
        }
    } else { // change desc field
        await client.hSet(item, key, newVal);
    }
    return succ(undefined);
}

/**
 * removes an item from the agenda
 * @param item name of item to remove
 * @returns indication of success, or failure with message
 */
export async function rem(item: string): Promise<Result<void>> {
    await connect();
    // check if item exists
    if (!await client.hExists(item, "importance")) {
        return fail(`Item "${item}" not in agenda`);
    }
    // remove item, flag cache as dirty
    await client.del(item);
    cacheDirty = true;
    return succ(undefined);
}

/**
 * gets all items in the agenda sorted by importance and then by insertion order
 * @returns all items in the agenda sorted by importance and then by insertion order, or an error message
 */
export async function getItems(): Promise<Result<Schema[]>> {
    await connect();
    // get all items, sort by importance and then by insertion order
    return succ(await items());
}

/**
 * gets all items in the agenda sorted by importance and then by insertion order
 * @returns indication of success, or failure with message
 */
export async function clear(): Promise<Result<void>> {
    await connect();
    // clear all items, flag cache as dirty
    const message = await client.flushDb();
    cacheDirty = true;
    if (!message.startsWith("OK")) {
        return fail(`agenda could not be cleared, got message: ${message}`);
    }
    return succ(undefined);
}