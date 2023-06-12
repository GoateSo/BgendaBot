import { View } from "@slack/bolt";
import { app } from "../app";
import { add } from "../utils/db";
import { isSucc } from "../utils/types";
import { fieldInput, ptext } from "../utils/commandModals";

// respond with modal input for adding an item
export function init() {

    app.command('/additem', async ({ ack, client, body }) => {
        await ack();

        const addModal: View = {
            "callback_id": "additem",
            "type": "modal",
            "title": ptext("Add an Agenda item"),
            "submit": ptext("Submit"),
            "close": ptext("Cancel"),
            "blocks": [
                {
                    "type": "input",
                    "block_id": "NameBlock",
                    "element": fieldInput("name", "AddAgendaName"),
                    "label": ptext("Item name")
                },
                {
                    "type": "input",
                    "block_id": "ImportanceBlock",
                    "element": fieldInput("importance", "AddAgendaImportance"),
                    "label": ptext("Pick an importance level"),
                },
                {
                    "type": "input",
                    "block_id": "DescBlock",
                    "element": fieldInput("desc", "AddAgendaDesc"),
                    "optional": true,
                    "label": ptext("Description")
                }
            ],
            "private_metadata": JSON.stringify({
                "channel": body.channel_id,
                "sender": body.user_id
            })
        }

        console.log(body.trigger_id);
        try {
            await client.views.open({
                trigger_id: body.trigger_id,
                view: addModal
            });
        } catch (e) {
            console.log("error in additem.ts");
            console.error(e);
        }
    });

    app.view('additem', async ({ ack, view, client }) => {
        await ack();
        const values = view.state.values;
        const name = values?.NameBlock?.AddAgendaName?.value;
        const imp = values?.ImportanceBlock?.AddAgendaImportance?.selected_option;
        const importance = imp?.value ?? "0";
        const desc = values?.DescBlock?.AddAgendaDesc?.value ?? "";
        if (!name) {
            console.error("missing name in add command");
            return;
        }
        const res = await add(name.trim(), { importance: parseInt(importance), desc: desc });
        const { channel, sender } = JSON.parse(view.private_metadata) as { channel: string, sender: string };
        await client.chat.postEphemeral({
            channel: channel,
            user: sender,
            text:
                isSucc(res) ?
                    `Added item ${name} with ${imp?.text?.text ?? "Default/Minimal"} importance  and description ${desc.trim() === "" ? "<empty>" : desc}`
                    : res.left
        });
    });
}