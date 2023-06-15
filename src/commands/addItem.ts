import { View } from "@slack/bolt";
import { app } from "../app";
import { add } from "../utils/db";
import { Fields, isSucc } from "../utils/types";
import { fieldInput, ptext } from "../utils/commandModals";

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
        const addModal: View = {
            callback_id: "additem",
            type: "modal",
            title: ptext("Add an Agenda item"),
            submit: ptext("Submit"),
            close: ptext("Cancel"),
            blocks: [
                {
                    type: "input",
                    block_id: "NameBlock",
                    element: fieldInput("name", "AddAgendaName"),
                    label: ptext("Item name"),
                },
                {
                    type: "input",
                    block_id: "ImportanceBlock",
                    element: fieldInput("importance", "AddAgendaImportance"),
                    label: ptext("Pick an importance level"),
                },
                {
                    type: "input",
                    block_id: "DescBlock",
                    element: fieldInput("desc", "AddAgendaDesc"),
                    optional: true,
                    label: ptext("Description"),
                },
                {
                    type: "input",
                    block_id: "DueDateBlock",
                    element: fieldInput("due_date", "AddAgendaDueDate"),
                    optional: true,
                    label: ptext("Due Date"),
                },
                {
                    type: "input",
                    block_id: "AssigneesBlock",
                    element: fieldInput("assignees", "AddAgendaAssignees"),
                    optional: true,
                    label: ptext("Assignees"),
                },
            ],
            private_metadata: JSON.stringify({
                channel: body.channel_id,
                sender: body.user_id,
            }),
        };

        await client.views.open({
            trigger_id: body.trigger_id,
            view: addModal,
        });
    });

    app.view("additem", async ({ ack, view, client }) => {
        await ack();
        const values = view.state.values;
        const name = values?.NameBlock?.AddAgendaName?.value;
        const imp = values?.ImportanceBlock?.AddAgendaImportance?.selected_option;
        const importance = imp?.value ?? "0";
        const desc = values?.DescBlock?.AddAgendaDesc?.value ?? "";
        const due_time =
            values?.DueDateBlock?.AddAgendaDueDate?.selected_date_time ?? 0;
        const assignees =
            values?.AssigneesBlock?.AddAgendaAssignees?.selected_users ?? [];
        if (!name) {
            console.error("missing name in add command");
            return;
        }
        const due_date = new Date(due_time * 1000);
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
            text: isSucc(res)
                ? `Added item "${name}" with ${imp?.text?.text ?? "Default/Minimal"} importance,` +
                `description "${desc.trim() === "" ? "<empty>" : desc}",` +
                `due date "${due_time === 0 ? "<none>" : due_date.toLocaleDateString()}", ` +
                `and assignees ${assignees.length === 0 ? "<none>" : assignees.map((u) => `<@${u}>`).join(", ")}`
                : res.left,
        });
    });
}
