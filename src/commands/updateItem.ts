import { SlashCommand, View } from "@slack/bolt";
import { app } from "../app";
import { FieldName, fieldInput, itemsToOptions, ptext } from "../utils/commandModals";
import { update } from "../utils/db";
import { isFail, isSucc } from "../utils/types";

// edit item, dynamic options
// query db for items, prompt field, and then prompt new value in new modal
// update view with either text input for name/desc or static select for importance
const initEditModal = async (body: SlashCommand): Promise<View> => {
    return {
        "title": ptext("Update an Agenda item"),
        "submit": ptext("Submit"),
        "close": ptext("Cancel"),
        "callback_id": "updateitem",
        "type": "modal",
        "blocks": [
            {
                type: "input",
                dispatch_action: true,
                element: {
                    "type": "static_select",
                    "placeholder": ptext("Select an item"),
                    "options": await itemsToOptions(),
                    "action_id": "EditItem"
                },
                label: ptext("Item"),
                block_id: "ItemBlock"
            },
            {
                type: "input",
                dispatch_action: true,
                element: {
                    type: "static_select",
                    placeholder: ptext("Select a field"),
                    action_id: "EditField",
                    options: [
                        { "text": ptext("Name"), "value": "name" },
                        { "text": ptext("Description"), "value": "desc" },
                        { "text": ptext("Importance"), "value": "importance" }
                    ]
                },
                label: ptext("Field"),
                block_id: "FieldBlock"
            }
        ],
        "private_metadata": JSON.stringify({
            "channel": body.channel_id,
            "sender": body.user_id
        })
    };
}

function isValidField(field: string): field is FieldName {
    return field === "name" || field === "desc" || field === "importance";
}

export function init() {
    app.command('/update', async ({ ack, client, body }) => {
        await ack();
        await client.views.open({
            trigger_id: body.trigger_id,
            view: await initEditModal(body)
        });
    });

    // acknowledge that item was chosen 
    app.action('EditItem', async ({ ack }) => {
        await ack();
    });


    // open new modal with relevent input based on chosen field
    app.action('EditField', async ({ ack, body, client }) => {
        await ack();
        if (body.type !== 'block_actions' || !body.view) {
            return;
        }
        const values = body.view.state.values;
        const item = values?.ItemBlock?.EditItem?.selected_option?.text.text;
        const field = values?.FieldBlock?.EditField?.selected_option?.value;
        console.log(values);
        console.log([item, field]);
        if (!field || !item) {
            console.error("no field or item provided");
            return;
        }
        if (!isValidField(field)) {
            console.error("invalid field provided");
            return;
        }
        const metadata = JSON.parse(body.view.private_metadata);
        console.log("opening modal")
        await client.views.update({
            view_id: body.view.id,
            hash: body.view.hash,
            view: {
                submit: ptext("Submit"),
                close: ptext("Cancel"),
                private_metadata: JSON.stringify({ item: item, field: field, ...metadata }),
                type: "modal",
                callback_id: "updatedUpdate",
                title: {
                    type: "plain_text",
                    text: "Update Description",
                    emoji: true
                },
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "plain_text",
                            text: `editing ${field} of ${item} `,
                        }
                    },
                    {
                        type: "input",
                        block_id: `updateBlock`,
                        element: fieldInput(field, "updateInput"),
                        label: {
                            type: "plain_text",
                            text: `new ${field}`,
                            emoji: true
                        }
                    }
                ]
            }
        });
    });

    // FIXME: this is a workaround for a bug in bolt with typescript
    // ack with errors apparently isn't implemented in types....
    app.view('updateitem', async ({ ack, view }) => {
        console.log("updateitem rannnnn");
        console.log(view.state.values);
        await ack({
            response_action: "errors",
            errors: {
                FieldBlock: "Please select a field"
            }
        } as any);
    });

    app.view('updatedUpdate', async ({ ack, view, client }) => {
        await ack();
        const input = view.state.values.updateBlock.updateInput;
        // console.log(values);
        const { item, field } = JSON.parse(view.private_metadata) as { item: string, field: string };
        let nval: string | null | undefined;
        const selected = input.selected_option;
        if (selected) { // importance
            nval = selected.text.text;
        } else { // name / desc 
            nval = input.value;
        }
        if (!nval) {
            console.error("no new value");
            return;
        }
        const fieldName = field.toLowerCase().trim();
        if (fieldName !== "importance" && fieldName !== "name" && fieldName !== "desc") {
            console.error("invalid field");
            return;
        }
        const res = await update(item.trim(), fieldName, nval);
        const { channel, sender } = JSON.parse(view.private_metadata) as { channel: string, sender: string };
        await client.chat.postEphemeral({
            channel: channel,
            user: sender,
            text: isSucc(res)
                ? `updated ${field} of ${item} to ${nval}`
                : `failed update: ${res.left}`
        });
    });
}