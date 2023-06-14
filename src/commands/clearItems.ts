import { app } from "../app";
import { clear } from "../utils/db";
import { isSucc } from "../utils/types";

/**
 * init function for the clearitems command, which clears all items from the database, and responds with a message 
 * to the user detailing the success or failure of the operation
 */
export function init() {
    app.command('/clearitems', async ({ ack, respond }) => {
        await ack();
        const res = await clear();
        await respond(isSucc(res)
            ? `clearing succeeded: all items successfully cleared`
            : `clearing failed: ${res.left}`
        );
    });
}