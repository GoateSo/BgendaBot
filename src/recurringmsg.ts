import { RecurrenceRule, scheduleJob } from "node-schedule";
import { getItems } from "./utils/db";
import { formatItems } from "./utils/agendaList";
import { app } from "./app";
import { failed } from "./utils/Result";

const rule = new RecurrenceRule();
rule.dayOfWeek = [2];
rule.hour = 17;
rule.minute = 45;

// every 5 minutes
export const job = scheduleJob(rule, async () => {
    // send message to channel
    const res = await getItems();
    if (failed(res)) {
        console.error(`failed to get items: ${res.reason}`);
        return;
    }
    const items = res.value;
    const msg = formatItems(items);
    await app.client.chat.postMessage({
        channel: process.env.CHANNEL_ID as string,
        text: "Agenda Items",
        blocks: msg.blocks,
        attachments: msg.attachments,
    });
});