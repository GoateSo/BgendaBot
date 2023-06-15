import { View } from "@slack/bolt";
import { app } from "../app";
import { itemsToOptions, ptext } from "../utils/commandModals";
import { rem } from "../utils/db";
import { isSucc } from "../utils/types";

/**
 * initializes the /remitem command and its corresponding view submission listener
 * 
 * - /remitem - opens a modal for removing an item, prompting for the item to remove
 * - view submission - removes the item from the database and responds with a message to the user detailing the success or failure of the operation
 */
export function init() {
    app.command('/remitem', async ({ ack, client, body }) => {
        // removal of item, dynamic options
        // query db for items, then create options from them
        const remModal = async (): Promise<View> => {
            return {
                "callback_id": "remitem",
                "title": ptext("Remove an Agenda item"),
                "submit": ptext("Submit"),
                "close": ptext("Cancel"),
                "type": "modal",
                "blocks": [
                    {
                        type: "input",
                        dispatch_action: true,
                        element: {
                            "type": "static_select",
                            "placeholder": ptext("Select an item"),
                            "options": await itemsToOptions(),
                            "action_id": "RemoveItem"
                        },
                        label: ptext("Item"),
                        block_id: "ItemBlock"
                    }
                ],
                "private_metadata": JSON.stringify({
                    "channel": body.channel_id,
                    "sender": body.user_id
                })
            };
        }

        await ack();
        try {
            await client.views.open({
                trigger_id: body.trigger_id,
                view: await remModal()
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
            text: isSucc(res) ? `removal succeeded: ${item} successfully removed` : `removal failed: ${res.left}`
        });
    });
}
