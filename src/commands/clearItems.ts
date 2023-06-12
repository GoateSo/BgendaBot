import { app } from "../app";
import { clear } from "../utils/db";
import { isSucc } from "../utils/types";

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