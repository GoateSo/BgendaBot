import { app } from "../app";
import { update } from "../utils/db";
import { UpdateData } from "../utils/types";
import { failed, succeeded } from "../utils/Result";
import { getInputs, initEditModal, processInputs, updateView } from "./helpers/updateHelpers";

/**
 * Initialize the update item command, and sets up all required listeners
 *
 * - `/update` - opens a modal to update an item, originally prompts for just the item name and field to update via
 *               dropdowns (static_selects) and then opens a new modal with the appropriate input type (text_input or
 *               static_select) based
 *               on the field chosen
 * - `EditItem` - acknowledge that item was chosen, does nothing else
 * - `EditField` - opens new modal with relevent input based on chosen field
 *                 - `name` - text_input
 *                 - `desc` - text_input
 *                 - `importance` - static_select
 * - `updateitem` - shouldn't be ever fired -- premature click on submit button before field is chosen and the modal
 *                  is updated
 * - `updatedUpdate` - the updated modal for the update command (ik not a rly good name but w/e), updates the database
 *                     with the new value and then sends an ephemeral message to the user either with the error message
 *                     produced, or a success message
 */
export function init() {
    // open a modal to update an item
    app.command("/update", async ({ ack, client, body }) => {
        await ack();
        await client.views.open({
            trigger_id: body.trigger_id,
            view: await initEditModal(body),
        });
    });

    // open new modal with relevent input based on chosen field
    // fires on modification of either the name or field input
    app.action("Edit", async ({ ack, body, client }) => {
        await ack();
        if (body.type !== "block_actions" || !body.view) {
            return;
        }
        const values = getInputs(body);
        if (failed(values)) {
            return;
        }
        await client.views.update({
            view_id: body.view.id,
            hash: body.view.hash,
            view: updateView(values.value),
        });
    });

    // FIXME: this is a workaround for a bug in bolt with typescript
    // ack with errors apparently isn't implemented in types....
    app.view("updateitem", async ({ ack }) => {
        await ack({
            response_action: "errors",
            errors: {
                FieldBlock: "Please select a field and name",
            },
        } as any);
    });

    // update send request to db, and send ephemeral message to user with success or error message
    app.view("updatedUpdate", async ({ ack, view, client }) => {
        await ack();
        const input = view.state.values.updateBlock.updateInput;
        const { item, field, channel, sender } = JSON.parse(
            view.private_metadata
        ) as UpdateData;
        const [newVal, dispStr] = processInputs(field, input);
        const res = await update(item, field, newVal);
        await client.chat.postEphemeral({
            channel: channel,
            user: sender,
            text: succeeded(res)
                ? `updated ${field} of ${item} to ${dispStr}`
                : `failed update: ${res.reason}`,
        });
    });
}
