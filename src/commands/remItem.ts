import { app } from "../app";
import { rem } from "../utils/db";
import { succeeded } from "../utils/Result";
import { remModal } from "./helpers/remHelpers";

/**
 * initializes the /remitem command and its corresponding view submission listener
 * 
 * - /remitem - opens a modal for removing an item, prompting for the item to remove
 * - view submission - removes the item from the database and responds with a message 
 *   to the user detailing the success or failure of the operation
 */
export function init() {
    app.command('/remitem', async ({ ack, client, body }) => {
        // removal of item, dynamic options
        // query db for items, then create options from them
        const view = await remModal();
        view.private_metadata = JSON.stringify({
            channel: body.channel_id,
            sender: body.user_id
        });
        await ack();
        try {
            await client.views.open({
                trigger_id: body.trigger_id,
                view: view
            });
        } catch (e) {
            console.error(e);
        }
    });

    app.view('remitem', async ({ ack, view, client }) => {
        await ack();
        const values = view.state.values;
        const item = values?.ItemBlock?.RemoveItem?.selected_option?.text.text;
        if (!item) {
            console.error("no item selected");
            return;
        }
        // could still fail even w/ forced choices -- item could've been removed by someone else in the meantime
        const res = await rem(item);
        const { channel, sender } = JSON.parse(view.private_metadata) as { channel: string, sender: string };
        await client.chat.postEphemeral({
            channel: channel,
            user: sender,
            text: succeeded(res) ? `removal succeeded: ${item} successfully removed` : `removal failed: ${res.reason}`
        });
    });
}
