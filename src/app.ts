import { getItems } from './utils/db';
import { App, LogLevel } from '@slack/bolt';
import './utils/env';
import { isFail } from './utils/types';
import { RecurrenceRule, scheduleJob } from 'node-schedule';
import { formatItems } from './utils/agendaList';

// Commands
import * as Add from './commands/addItem';
import * as Remove from './commands/remItem';
import * as Clear from './commands/clearItems';
import * as List from './commands/listItems';
import * as Update from './commands/updateItem';
import * as Help from './commands/help';


export const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    logLevel: LogLevel.DEBUG,
});

app.use(async ({ next }) => {
    await next();
});

// initalize all commands:
// in future: perhaps use node-dir to do this instead of import
Add.init();
Remove.init();
Clear.init();
List.init();
Update.init();
Help.init();


const rule = new RecurrenceRule();
rule.dayOfWeek = [2];
rule.hour = 17;
rule.minute = 45;

// every 5 minutes
const job = scheduleJob(rule, async () => {
    // send message to channel
    const res = await getItems();
    if (isFail(res)) {
        console.log(`failed to get items: ${res.left}`);
        return;
    }
    const items = res.right;
    const msg = formatItems(items);
    const res2 = await app.client.chat.postMessage({
        channel: process.env.CHANNEL_ID as string,
        text: "Agenda Items",
        blocks: msg.blocks,
        attachments: msg.attachments,
    });
    if (res2.ok) {
        console.log("successfully sent message");
    } else {
        console.log(`failed to send message: ${res2.error}`);
    }
});

(async () => {
    await app.start(Number(process.env.PORT) || 3000);
    console.log('⚡️ Bolt app is running!');
    job.invoke();
})();
