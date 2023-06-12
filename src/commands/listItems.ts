import { app } from "../app";
import { getItems } from "../utils/db";
import { isSucc } from "../utils/types";
import { formatItems } from "../utils/agendaList";

export function init() {
    app.command('/listitems', async ({ ack, say }) => {
        await ack();
        const res = await getItems();
        await say(isSucc(res)
            ? formatItems(res.right)
            : `listing failed: ${res.left}`
        );
    });
}