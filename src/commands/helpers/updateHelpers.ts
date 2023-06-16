import { SlackAction, SlashCommand, View, ViewStateValue } from "@slack/bolt";
import { Inputs, UpdateData, isValidField } from "../../utils/types";
import { fieldInput, itemsToOptions, ptext } from "../../utils/commandModals";
import { Result, fail, succ } from "../../utils/Result";

/**
 * gets the new value for the field to be used in an update query
 * @param field field name to update
 * @param input input element from slack modal
 * @returns [newVal, dispStr] - newVal is the new value for the field, dispStr is the string to display in the modal
 */
export function processInputs(field: keyof Inputs, input: ViewStateValue): [Inputs[typeof field], string] {
    let nval: Inputs[typeof field]; // updated value for field
    let nstr: string; // toStringed version of nval for display
    switch (field) {
        case "name":
            nval = input.value ?? "";
            nstr = nval;
            break;
        case "desc":
            nval = input.value ?? "";
            nstr = nval;
            break;
        case "due_date":
            nval = (input.selected_date_time ?? 0).toString();
            nstr = new Date(parseInt(nval)).toLocaleString();
            break;
        case "assignees":
            nval = input.selected_users ?? [];
            nstr = nval.map(tag => `<@${tag}>`).join(", ");
            break;
        case "importance":
            nval = input.selected_option?.value ?? "";
            nstr = input.selected_option?.text.text ?? "";
            break;
    }
    return [nval, nstr];
}

// edit item, dynamic options
// query db for items, prompt field, and then prompt new value in new modal
// update view with either text input for name/desc or static select for importance
export const initEditModal = async (body: SlashCommand): Promise<View> => ({
    title: ptext("Update an Agenda item"),
    submit: ptext("Submit"),
    close: ptext("Cancel"),
    callback_id: "updateitem",
    type: "modal",
    blocks: [
        {
            type: "input",
            dispatch_action: true,
            element: {
                type: "static_select",
                placeholder: ptext("Select an item"),
                options: await itemsToOptions(),
                action_id: "Edit",
            },
            label: ptext("Item"),
            block_id: "ItemBlock",
        },
        {
            type: "input",
            dispatch_action: true,
            element: {
                type: "static_select",
                placeholder: ptext("Select a field"),
                action_id: "Edit",
                options: [
                    { text: ptext("Name"), value: "name" },
                    { text: ptext("Description"), value: "desc" },
                    { text: ptext("Importance"), value: "importance" },
                    { text: ptext("Due Date"), value: "due_date" },
                    { text: ptext("Assignees"), value: "assignees" },
                ],
            },
            label: ptext("Field"),
            block_id: "FieldBlock",
        },
    ],
    private_metadata: JSON.stringify({
        channel: body.channel_id,
        sender: body.user_id,
    }),
});

export function updateView({ item, field, channel, sender }: UpdateData): View {
    return {
        submit: ptext("Submit"),
        close: ptext("Cancel"),
        private_metadata: JSON.stringify({ item, field, channel, sender }),
        type: "modal",
        callback_id: "updatedUpdate",
        title: {
            type: "plain_text",
            text: "Update Description",
            emoji: true,
        },
        blocks: [
            {
                type: "section",
                text: {
                    type: "plain_text",
                    text: `editing ${field} of ${item} `,
                },
            },
            {
                type: "input",
                block_id: `updateBlock`,
                element: fieldInput(field, "updateInput"),
                optional: field === "assignees" ? true : false,
                label: {
                    type: "plain_text",
                    text: `new ${field}`,
                    emoji: true,
                },
            },
        ],
    };
}
export function getInputs(body: SlackAction): Result<UpdateData> {
    if (body.type !== "block_actions" || !body.view) {
        return fail("invalid body type");
    }

    const values = body.view.state.values;
    const item = values?.ItemBlock?.Edit?.selected_option?.text.text;
    const field = values?.FieldBlock?.Edit?.selected_option?.value;

    if (!field || !item) {
        return fail("invalid/no field or item provided");
    }
    if (!isValidField(field)) {
        // Field is static-select, so this should never happen
        console.error(
            "invalid field provided - implementation issue w/ field input"
        );
        return fail("invalid field provided - implementation issue w/ field input");
    }
    const metadata = JSON.parse(body.view.private_metadata);

    return succ({ item, field, ...metadata });
}
