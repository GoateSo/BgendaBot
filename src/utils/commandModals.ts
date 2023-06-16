import { PlainTextElement, PlainTextOption } from "@slack/bolt";
import { getItems } from "./db";
import { FieldInputMap, Inputs } from "./types";
import { failed } from "../utils/Result";


/**
 * Gets all items from the database and formats them into a list
 * @returns Promise of a list of options for a static select
 */
export async function itemsToOptions(): Promise<PlainTextOption[]> {
    // don't need to take the time to sort the items
    const items = await getItems(false);
    if (failed(items)) {
        throw new Error("Failed to get items");
    }
    return items.value.map((item, i) => {
        return {
            "text": ptext(item.name),
            "value": i.toString()
        };
    });
}

/**
 * Creates a plain text element with given text
 * @param text text to put into plain text element
 * @returns plain text element with given text
 */
export function ptext(text: string): PlainTextElement {
    return {
        type: "plain_text",
        text: text,
        emoji: true
    }
}

/**
 * 
 * @param field name of field, either "name", "desc", or "importance"
 * @param actid 
 * @returns a slack element for the given field
 */
export function fieldInput(field: keyof Inputs, actid: string): FieldInputMap[typeof field] {
    // ngl quite a bit of a pain to typecast to `FieldInputMap[typeof field];` not sure why 
    // typescript doesn't infer it when the function is defined w/ return type `: FieldInputMap[typeof field]`
    if (field === "name" || field === "desc") {
        return {
            "type": "plain_text_input",
            "action_id": actid,
            "initial_value": field === "name" ? undefined : "",
            "placeholder": ptext(field),
        } as FieldInputMap[typeof field];
    } else if (field === "importance") {
        return {
            "type": "static_select",
            "placeholder": ptext("importance level"),
            "initial_option": { "text": ptext("Minimal/Default"), "value": "0" },
            "options": [
                { "text": ptext("Minimal/Default"), "value": "0" },
                { "text": ptext("Low"), "value": "1" },
                { "text": ptext("Medium"), "value": "2" },
                { "text": ptext("High"), "value": "3" }
            ],
            "action_id": actid
        } as FieldInputMap[typeof field];
    } else if (field === "assignees") {
        return {
            "type": "multi_users_select",
            "placeholder": ptext("Select assignees"),
            "action_id": actid
        } as FieldInputMap[typeof field];
    } else if (field === "due_date") {
        return {
            "type": "datetimepicker",
            "action_id": actid,
        } as FieldInputMap[typeof field];
    } else {
        throw new Error("Invalid field");
    }
}