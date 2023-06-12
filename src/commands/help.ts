import { app } from "../app";

const helpMap: { [key: string]: string } = {
    additem: "*/additem* - adds an agenda item with an optional importance level and added info",
    remitem: "*/remitem* - removes an agenda item",
    listitems: "*/listitems* - lists all agenda items in order of importance and then in insertion order",
    clearitems: "*/clearitems* - clears all agenda items",
    updateitem: "*/update* - updates an agenda item's importance level or added info",
    help: "*/help* - lists all commands and their descriptions"
}

export function init() {
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
}