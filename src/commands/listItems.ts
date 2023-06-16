import { app } from "../app";
import { getItems } from "../utils/db";
import { succeeded } from "../utils/Result";
import { formatItems } from "../utils/agendaList";

/**
 * init function for the listitems command, which lists all items in the database, and responds with a message
 * either listing the items, or detailing the failure of the operation
 * 
 * each item listing has a colored band on the left side, 
 * which is colored based on the item's priority (see utils/agendaList)
 * and the item's name. If a description is present, it is listed below the name, otherwise just the name is listed 
 * 
 */
export function init() {
    app.command('/listitems', async ({ ack, say }) => {
        await ack();
        const res = await getItems();
        await say(succeeded(res)
            ? formatItems(res.value)
            : `listing failed: ${res.reason}`
        );
    });
}