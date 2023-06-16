import { app } from "../app";

const helpMap: { [key: string]: string } = {
    additem: "*/additem* - adds an agenda item with an importance level, " +
        "and optional additional info such as a description, due date, and assignees",
    remitem: "*/remitem* - removes an agenda item",
    listitems: "*/listitems* - lists all agenda items in order of importance and then in insertion order",
    clearitems: "*/clearitems* - clears all agenda items",
    updateitem: "*/update* - updates an agenda item's name, importance, description, due date, or assignees",
    help: "*/help* - lists all commands and their descriptions"
}

/**
 * initializes the help command for the app, which lists all commands and their descriptions, 
 * or a specific command's description if given
 */
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