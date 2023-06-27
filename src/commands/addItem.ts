import { app } from "../app";
import { add } from "../utils/db";
import { Fields } from "../utils/types";
import { succeeded } from "../utils/Result";
import { addModal } from "./helpers/addHelpers";

// respond with modal input for adding an item
/**
 * init function for the additem command, setting up the slash command and the view submission listener
 *
 * - \additem -  opens a modal for adding an item, prompting for name, importance, and description, of 
 *               which only name is required,
 *               importance has a default of '0', and description is optional
 * - view submission - adds the item to the database and responds with a message to the user detailing the 
 *                     success or failure of the operation with an accompanying message
 *
 */
export function init() {
    app.command("/additem", async ({ ack, client, body }) => {
        await ack();
        // command body provided, will be used as name field
        if (body.text) {
            const input: Fields = {
                name: body.text,
                importance: "0",
                desc: "",
                due_date: "0",
            };
            const res = await add(input);
            await client.chat.postMessage({
                channel: body.channel_id,
                text: succeeded(res)
                    ? `adding succeeded: item "${body.text}" successfully added`
                    : res.reason,
            });
            return;
        }
        // no command body provided, open modal
        const view = addModal();
        view.private_metadata = JSON.stringify({
            channel: body.channel_id,
            sender: body.user_id,
        });

        await client.views.open({
            trigger_id: body.trigger_id,
            view: view,
        });
    });

    app.view("additem", async ({ ack, view, client }) => {
        await ack();
        const values = view.state.values;
        // get all inputs from the modal
        const name = values?.NameBlock?.AgendaName?.value;
        const imp = values?.ImportanceBlock?.AgendaImportance?.selected_option;
        const importance = imp?.value ?? "0";
        const desc = values?.DescBlock?.AgendaDesc?.value ?? "";
        const due_time = values?.DueDateBlock?.AgendaDueDate?.selected_date_time ?? 0;
        const assignees = values?.AssigneesBlock?.AgendaAssignees?.selected_users ?? [];
        if (!name) {
            console.error("missing name in add command");
            return;
        }
        // const
        const input: Fields = {
            name: name.trim(),
            importance: importance,
            desc: desc,
            due_date: due_time.toString(),
        };
        const res = await add(input, assignees);
        const { channel, sender } = JSON.parse(view.private_metadata) as {
            channel: string;
            sender: string;
        };

        await client.chat.postEphemeral({
            channel: channel,
            user: sender,
            text: succeeded(res)
                ? `Added item "${name}" with ${imp?.text?.text ?? "Default/Minimal"} importance,` +
                `description "${desc.trim() === "" ? "<empty>" : desc}",` +
                `due date "${due_time === 0 ? "<none>" : new Date(due_time * 1000).toLocaleDateString()}", ` +
                `and assignees ${assignees.length === 0 ? "<none>" : assignees.map((u) => `<@${u}>`).join(", ")}`
                : res.reason,
        });
    });
}
