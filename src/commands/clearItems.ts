import { app } from "../app";
import { clear } from "../utils/db";
import { succeeded } from "../utils/Result";

/**
 * init function for the clearitems command, which clears all items from the database, and responds with a message 
 * to the user detailing the success or failure of the operation
 */
export function init() {
    app.command('/clearitems', async ({ ack, respond }) => {
        await ack();
        const res = await clear();
        await respond(succeeded(res)
            ? `clearing succeeded: all items successfully cleared`
            : `clearing failed: ${res.reason}`
        );
    });
}