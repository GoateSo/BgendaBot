import { createClient } from 'redis';
import { left as fail, right as succ } from 'fp-ts/lib/Either';
import { Importance, Schema, fromStr, isValidImportance, Result } from './types';

const client = createClient();

client.on('error', (err) => {
    console.error(err);
});

async function connect() {
    if (!client.isOpen) await client.connect();
}


// internal helper functions to get items
// returns all items in the agenda, sorted by importance and insertion order, unless specified otherwise
async function queryItems(sorted = true): Promise<Schema[]> {
    const cache: Schema[] = [];
    // get all items from db
    for await (const name of client.scanIterator()) {
        const { time, importance, desc } = await client.hGetAll(name) as Schema;
        cache.push({ name, time, importance, desc });
    }
    if (!sorted) return cache;
    // sort cache by importance, secondarily by insertion order
    cache.sort((a, b) => {
        const importanceA = parseInt(a.importance);
        const importanceB = parseInt(b.importance);
        if (importanceA == importanceB) {
            return a.time.localeCompare(b.time);
        } else {
            return importanceB - importanceA; // hi importance first
        }
    });
    return cache;
}
// uses importance as a proxy check for existence in DB queries

/**
 * adds an item to the agenda, failinb if the item already existsc in the agenda
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
        // add item with default importance and desc
        await client.hSet(item, {
            time: new Date().toISOString(),
            importance: importance,
            desc: desc
        });
        return succ(undefined);
    }
}

/**
 * updates an agenda item with a new importance level or more info
 * @param item item to update
 * @param key field to update in item
 * @param newVal new value for field
 * @returns indiction of success, or failure with message
 */
export async function update(item: string, key: "importance" | "desc" | "name", newVal: string): Promise<Result<void>> {
    await connect();
    // check if item exists
    if (!await client.hExists(item, "importance"))
        return fail(`Item "${item}" not in agenda`);
    // change importance field  
    if (key === "importance") {
        newVal = newVal.trim().toUpperCase();
        if (isNaN(parseInt(newVal))) { // string importance
            if (!isValidImportance(newVal))
                return fail(`Invalid importance level "${newVal}"`);
            await client.hSet(item, key, fromStr(newVal));
        } else { // direct numeric importance
            const n = parseInt(newVal);
            if (n < Importance.MIN || n > Importance.MAX)
                return fail(`Invalid importance level "${newVal}"`);
            await client.hSet(item, key, n);
        }
    } else if (key === "desc") { // change desc field
        await client.hSet(item, key, newVal);
    } else if (key == "name") { // change name field
        // check if new name already exists
        if (await client.hExists(newVal, "importance")) {
            return fail(`Item with name "${newVal}" already in agenda`);
        }
        // get item from db
        // schema technically isn't correct b/c name isn't a field, but it works for this sake
        const { time, importance, desc } = await client.hGetAll(item) as Schema;
        // remove old item, add new item
        await client.del(item);
        await client.hSet(newVal, { time, importance, desc });
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
    await client.del(item);
    return succ(undefined);
}

/**
 * gets all items in the agenda sorted by importance and then by insertion order
 * @returns all items in the agenda sorted by importance and then by insertion order, or an error message
 */
export async function getItems(sorted = true): Promise<Result<Schema[]>> {
    await connect();
    return succ(await queryItems(sorted));
}

/**
 * gets all items in the agenda sorted by importance and then by insertion order
 * @returns indication of success, or failure with message
 */
export async function clear(): Promise<Result<void>> {
    await connect();
    const message = await client.flushDb();
    if (!message.startsWith("OK")) {
        return fail(`agenda could not be cleared, got message: ${message}`);
    }
    return succ(undefined);
}