import { SlackAction, SlashCommand, View } from "@slack/bolt";
import { app } from "../app";
import { fieldInput, itemsToOptions, ptext } from "../utils/commandModals";
import { update } from "../utils/db";
import { Result, UpdateData, isFail, isSucc, isValidField } from "../utils/types";
import { left as fail, right as succ } from 'fp-ts/lib/Either';

function updateView({ item, field, channel, sender }: UpdateData): View {
    return {
        submit: ptext("Submit"),
        close: ptext("Cancel"),
        private_metadata: JSON.stringify({ item, field, channel, sender }),
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
                optional: field === "assignees" ? true : false,
                label: {
                    type: "plain_text",
                    text: `new ${field}`,
                    emoji: true
                }
            }
        ]
    };
}
function getInputs(body: SlackAction): Result<UpdateData> {
    if (body.type !== 'block_actions' || !body.view) {
        return fail("invalid body type");
    }

    const values = body.view.state.values;
    const item = values?.ItemBlock?.Edit?.selected_option?.text.text;
    const field = values?.FieldBlock?.Edit?.selected_option?.value;

    if (!field || !item) {
        // both are required fields, so this should never happen
        console.error("no field or item provided");
        return fail("invalid field or item provided");
    }
    if (!isValidField(field)) {
        // Field is static-select, so this should never happen
        console.error("invalid field provided - implementation issue w/ field input");
        return fail("invalid field provided - implementation issue w/ field input");
    }
    const metadata = JSON.parse(body.view.private_metadata);

    return succ({ item, field, ...metadata });
}
// edit item, dynamic options
// query db for items, prompt field, and then prompt new value in new modal
// update view with either text input for name/desc or static select for importance
const initEditModal = async (body: SlashCommand): Promise<View> => ({
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
                "action_id": "Edit"
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
                action_id: "Edit",
                options: [
                    { "text": ptext("Name"), "value": "name" },
                    { "text": ptext("Description"), "value": "desc" },
                    { "text": ptext("Importance"), "value": "importance" },
                    { "text": ptext("Due Date"), "value": "due_date" },
                    { "text": ptext("Assignees"), "value": "assignees" }
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
});




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

    // open new modal with relevent input based on chosen field
    app.action('Edit', async ({ ack, body, client }) => {
        await ack();
        if (body.type !== 'block_actions' || !body.view) {
            return;
        }
        const values = getInputs(body);
        if (isFail(values)) {
            return;
        }
        await client.views.update({
            view_id: body.view.id,
            hash: body.view.hash,
            view: updateView(values.right)
        });
    });

    // FIXME: this is a workaround for a bug in bolt with typescript
    // ack with errors apparently isn't implemented in types....
    app.view('updateitem', async ({ ack }) => {
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
        const { item, field, channel, sender } = JSON.parse(view.private_metadata) as UpdateData;
        // 4 cases: text_input for name/desc, static_select for importance, datepicker for due_date, multi_select for assignees
        // 1st three resuslt in string, last results in array of strings
        let nval: string | string[]
        let res: Result<void>;
        if (field === "assignees") {
            nval = input.selected_users ?? [];
            res = await update(item.trim(), field, nval);
            // for display purposes, convert to @user1, @user2, @user3
            nval = nval.map((user: string) => `<@${user}>`).join(", ");
        } else if (field === "due_date") {
            nval = input.selected_date ?? "";
            if (nval.length === 0) {
                console.error("no new due date provided to update -- issue w/ my implementation of EditField action");
                return;
            }
            res = await update(item.trim(), field, nval);
        } else {
            // if its static select, get the text in text field, otherwise get the value
            // this works out better for feedback purposes (e.g. "updated importance to high")
            nval = (input.selected_option
                ? input.selected_option.text.text
                : input.value) ?? "";
            if (nval.length === 0) {
                // required field option should handle this w/o this check
                console.error("no new value provided to update -- issue w/ my implementation of EditField action");
                return;
            }
            const fieldName = field.toLowerCase().trim();
            if (fieldName !== "importance" && fieldName !== "name" && fieldName !== "desc") {
                // this should never happen
                console.error("invalid field provided to update -- issue w/ my implementation of EditField action");
                return;
            }
            res = await update(item.trim(), fieldName, nval);
        }
        await client.chat.postEphemeral({
            channel: channel,
            user: sender,
            text: isSucc(res)
                ? `updated ${field} of ${item} to ${nval}`
                : `failed update: ${res.left}`
        });
    });
}