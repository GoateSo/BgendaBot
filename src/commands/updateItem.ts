import { SlashCommand, View } from "@slack/bolt";
import { app } from "../app";
import { FieldName, fieldInput, itemsToOptions, ptext } from "../utils/commandModals";
import { update } from "../utils/db";
import { isSucc } from "../utils/types";

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

/**
 * checks if a given string is a valid field of the item 
 * currently, the fields are 
 * - name
 * - desc
 * - importance
 * @param field string to check if it is a valid field name
 * @returns boolean if the field is a valid field name
 */
function isValidField(field: string): field is FieldName {
    return field === "name" || field === "desc" || field === "importance";
}

/**
 * Initialize the update item command, and sets up all required listeners
 * 
 * - `/update` - opens a modal to update an item, originally prompts for just the item name and field to update via dropdowns
 *               (static_selects) and then opens a new modal with the appropriate input type (text_input or static_select) based
 *               on the field chosen
 * - `EditItem` - acknowledge that item was chosen, does nothing else
 * - `EditField` - opens new modal with relevent input based on chosen field
 *                 - `name` - text_input
 *                 - `desc` - text_input
 *                 - `importance` - static_select
 * - `updateitem` - shouldn't be ever fired -- premature click on submit button before field is chosen and the modal is updated 
 * - `updatedUpdate` - the updated modal for the update command (ik not a rly good name but w/e), updates the database with the new value
 *                     and then sends an ephemeral message to the user either with the error message produced, or a success message
 */
export function init() {
    // open a modal to update an item
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

    // update send request to db, and send ephemeral message to user with success or error message
    app.view('updatedUpdate', async ({ ack, view, client }) => {
        await ack();
        const input = view.state.values.updateBlock.updateInput;
        const { item, field } = JSON.parse(view.private_metadata) as { item: string, field: string };
        // if its static select, get the text in text field, otherwise get the value
        // this works out better for feedback purposes (e.g. "updated importance to high")
        const nval = input.selected_option
            ? input.selected_option.text.text
            : input.value;
        if (!nval) {
            console.error("no new value provided to update"); // required field option should handle this
            return;
        }
        const fieldName = field.toLowerCase().trim();
        if (fieldName !== "importance" && fieldName !== "name" && fieldName !== "desc") {
            // this should never happen
            console.error("invalid field provided to update -- issue w/ my implementation of EditField action");
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