import { createClient } from 'redis';
import { Importance, Schema, fromStr, isValidImportance, Fields, AgendaItem, Inputs } from './types';
import { Result, fail, succ } from "../utils/Result";

const client = createClient();

client.on('error', console.error);

async function connect() {
    if (!client.isOpen) await client.connect();
}

// internal helper functions to get items
// returns all items in the agenda, sorted by importance and insertion order, unless specified otherwise
async function queryItems(sorted = true): Promise<AgendaItem[]> {
    const cache: AgendaItem[] = [];
    // get all items from db
    for await (const name of client.scanIterator()) {
        // skip assignees convenience keys
        if (name.endsWith(":assignees")) continue;
        const { time, importance, desc, due_date } = await client.hGetAll(name) as Schema;
        const assignees = await client.lRange(`${name}:assignees`, 0, -1);
        cache.push({ name, time, importance, desc, due_date, assignees });
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
export async function add(xs: Fields, assignees: string[] = []): Promise<Result<void>> {
    await connect();
    const { name, importance, desc, due_date } = xs;
    // check if item already exists
    if (await client.hExists(name, "importance")) {
        return fail(`Item "${name}" already in agenda`);
    } else {
        // add item with default importance and desc
        await client.hSet(name, {
            time: new Date().toISOString(),
            importance: importance,
            desc: desc,
            due_date: due_date ?? "",
        });
        // add assignees
        for (const assignee of assignees) {
            client.lPush(`${name}:assignees`, assignee);
        }
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
export async function update(item: string, key: keyof Inputs, newVal: Inputs[typeof key]): Promise<Result<void>> {
    await connect();
    // check if item exists
    if (!await client.hExists(item, "importance"))
        return fail(`Item "${item}" not in agenda`);
    // change importance field  
    if (key === "importance") {

        let nval: Inputs[typeof key] = newVal as string;
        nval = nval.trim().toUpperCase();
        if (isNaN(parseInt(nval))) { // string importance
            if (!isValidImportance(nval))
                return fail(`Invalid importance level "${nval}"`);
            await client.hSet(item, key, fromStr(nval));
        } else { // direct numeric importance
            const n = parseInt(nval);
            if (n < Importance.MIN || n > Importance.MAX)
                return fail(`Invalid importance level "${nval}"`);
            await client.hSet(item, key, n);
        }

    } else if (key === "desc") { // change desc field

        const nval: Inputs[typeof key] = newVal as string;
        await client.hSet(item, key, nval);

    } else if (key === "name") { // change name field

        const nval: Inputs[typeof key] = newVal as string;
        // check if new name already exists
        console.error("item name:", nval)
        if (await client.hExists(nval, "importance")) {
            return fail(`Item with name "${nval}" already in agenda`);
        }
        // get item from db (technically type assert isnt right b/c name isn't in db)
        const { time, importance, desc, due_date } = await client.hGetAll(item) as Schema;
        // get assignees
        const assignees = await client.lRange(`${item}:assignees`, 0, -1);
        // remove old item (making sure to remove assignees)
        await client.del(item);
        await client.del(`${item}:assignees`);
        // add new item, and assignees
        await client.hSet(
            nval, { time, importance, desc, due_date }
        );
        for (const assignee of assignees) {
            client.lPush(`${nval}:assignees`, assignee);
        }

    } else if (key === "due_date") {

        const nval: Inputs[typeof key] = newVal as string;
        await client.hSet(item, key, nval);

    } else if (key === "assignees") {

        await client.del(`${item}:assignees`);
        for (const assignee of newVal) {
            client.lPush(`${item}:assignees`, assignee);
        }

    } else {
        return fail(`Invalid field "${key}"`);
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
    // remove item
    await client.del(item);
    // remove assignees
    await client.del(`${item}:assignees`);
    return succ(undefined);
}

/**
 * gets all items in the agenda sorted by importance and then by insertion order
 * @returns all items in the agenda sorted by importance and then by insertion order, or an error message
 */
export async function getItems(sorted = true): Promise<Result<AgendaItem[]>> {
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