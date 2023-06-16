import { View } from "@slack/bolt";
import { fieldInput, ptext } from "../../utils/commandModals";

export const addModal = (): View => ({
    callback_id: "additem",
    type: "modal",
    title: ptext("Add an Agenda item"),
    submit: ptext("Submit"),
    close: ptext("Cancel"),
    blocks: [
        {
            type: "input",
            block_id: "NameBlock",
            element: fieldInput("name", "AgendaName"),
            label: ptext("Item name"),
        },
        {
            type: "input",
            block_id: "ImportanceBlock",
            element: fieldInput("importance", "AgendaImportance"),
            label: ptext("Pick an importance level"),
        },
        {
            type: "input",
            block_id: "DescBlock",
            element: fieldInput("desc", "AgendaDesc"),
            optional: true,
            label: ptext("Description"),
        },
        {
            type: "input",
            block_id: "DueDateBlock",
            element: fieldInput("due_date", "AgendaDueDate"),
            optional: true,
            label: ptext("Due Date"),
        },
        {
            type: "input",
            block_id: "AssigneesBlock",
            element: fieldInput("assignees", "AgendaAssignees"),
            optional: true,
            label: ptext("Assignees"),
        },
    ],
});