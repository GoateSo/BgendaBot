import { add, clear, getItems, isCacheDirty, rem, update } from './utils/db';
import { App, LogLevel, MessageAttachment, RespondArguments } from '@slack/bolt';
import './utils/env';
import { Schema, Result, isFail, isSucc } from './utils/types';
import { left as fail, right as succ } from 'fp-ts/lib/Either';

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    logLevel: LogLevel.DEBUG,
});

// colors for different importance levels
const colors = [
    "#35373b", // default/min   (0) 
    "#36a64f", // low           (1)
    "#daa038", // medium        (2)
    "#a30200", // high          (3)
]

function getColor(importance: string) {
    const imp = Number.parseInt(importance);
    if (isNaN(imp) || imp < 0 || imp > 3) throw new Error(`importance level ${importance} is not valid`);
    return colors[imp];
}

function formatItems(xs: Schema[]): RespondArguments {
    const attachments: MessageAttachment[] = [];
    for (const [key, { name, importance, desc }] of xs.entries()) {
        // don't add a new line for description if there is none
        const ndesc = desc.trim() === "" ? "" : `\n description: ${desc}`;
        attachments.push({
            text: `${key + 1}. ${name}${ndesc}`,
            color: getColor(importance),
        });
    }
    // if there are no items, add a default message
    if (attachments.length == 0) {
        attachments.push({
            text: `nothing has to be done :D`,
            color: "#ffffff",
        });
    }
    // format in a slack-friendly way
    return {
        blocks: [{
            type: "header",
            text: {
                type: "plain_text",
                text: "Current Agenda Items:",
                emoji: true
            }
        }],
        attachments: attachments
    }
}

app.use(async ({ next }) => {
    await next();
});

app.command('/additem', async ({ command, ack, say }) => {
    await ack();
    const res = await add(command.text);
    await say(isSucc(res)
        ? `addition succeeded: ${command.text} successfully added`
        : `addition failed: ${res.left}`
    );

});

app.command('/remitem', async ({ command, ack, say }) => {
    await ack();
    const res = await rem(command.text);
    await say(isSucc(res)
        ? `removal succeeded: ${command.text} successfully removed`
        : `removal failed: ${res.left}`
    );
});

app.command('/listitems', async ({ ack, say }) => {
    await ack();
    const res = await getItems();
    await say(isSucc(res)
        ? formatItems(res.right)
        : `listing failed: ${res.left}`
    );
});

app.command('/clearitems', async ({ ack, say }) => {
    await ack();
    const res = await clear();
    await say(isSucc(res)
        ? `clearing succeeded: all items successfully cleared`
        : `clearing failed: ${res.left}`
    );
});

async function updateCheck(input: string): Promise<Result<[number, string, string]>> {
    if (isCacheDirty()) {
        return fail(
            "update failed: data seems to have been modified since last update; " +
            "please run /listitems again to make sure you have the latest data"
        )
    }
    const inputs = input.trimStart().match(/^([0-9]+)\s+?(.+)$/);
    if (inputs == null) {
        return fail(`update failed: invalid input`);
    }
    const [id, newVal] = inputs.slice(1);
    const res = await getItems();
    if (isFail(res)) {
        return fail(`update failed on getting items: ${res.left}`);
    }
    return succ([parseInt(id), res.right[parseInt(id) - 1].name, newVal]);
}

app.command('/updateimportance', async ({ command, ack, say }) => {
    await ack();
    const res = await updateCheck(command.text);
    if (isFail(res)) {
        await say(res.left);
        return;
    }
    const [id, item, newImp] = res.right;
    const res2 = await update(item, "importance", newImp);
    await say(isSucc(res2)
        ? `update succeeded: item ${id} ("${item}")'s importance was successfully updated`
        : `update failed: ${res2.left}`
    );
});

app.command('/updatedesc', async ({ command, ack, say }) => {
    await ack();
    const res = await updateCheck(command.text);
    if (isFail(res)) {
        await say(res.left);
        return;
    }
    const [id, item, newDesc] = res.right;
    const res2 = await update(item, "desc", newDesc);
    await say(isSucc(res2)
        ? `update succeeded: item ${id} ("${item}")'s description was successfully updated`
        : `update failed: ${res2.left}`
    );
});

const helpMap: { [key: string]: string } = {
    additem: "*/additem* [itemName] - adds an agenda item with an optional importance level and added info",
    remitem: "*/remitem* [itemName] - removes an agenda item",
    listitems: "*/listitems* - lists all agenda items in order of importance and then in insertion order",
    clearitems: "*/clearitems* - clears all agenda items",
    updateitem: "*/updateitem* [itemName] field=('importance'|'desc') - updates an agenda item's importance level or added info",
    help: "*/help* - lists all commands and their descriptions"
}
app.command('/help', async ({ ack, respond, command }) => {
    await ack();
    let helpText = "";
    if (command.text.trim() == "") {
        helpText = Object.keys(helpMap).map(a => helpMap[a]).join("\n");
    } else {
        const help = helpMap[command.text.trim()];
        if (help == undefined) {
            helpText = `invalid command: ${command.text.trim()}`;
        } else {
            helpText = help;
        }
    }
    await respond({
        blocks: [{
            type: "header",
            text: {
                type: "plain_text",
                text: "Help Menu:",
                emoji: true
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: helpText
            }
        }]
    });
});


(async () => {
    // Start your app
    await app.start(Number(process.env.PORT) || 3000);
    console.log('⚡️ Bolt app is running!');

})();