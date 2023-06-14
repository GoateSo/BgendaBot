import { PlainTextElement, PlainTextInput, PlainTextOption, StaticSelect } from "@slack/bolt";
import { getItems } from "./db";
import { isFail } from "./types";

/**
 * Gets all items from the database and formats them into a list
 * @returns Promise of a list of options for a static select
 */
export async function itemsToOptions(): Promise<PlainTextOption[]> {
    // don't need to take the time to sort the items
    const items = await getItems(false);
    if (isFail(items)) {
        throw new Error("Failed to get items");
    }
    return items.right.map((item, i) => {
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

type FieldInput = StaticSelect | PlainTextInput;
export type FieldName = "name" | "desc" | "importance";

/**
 * 
 * @param field name of field, either "name", "desc", or "importance"
 * @param actid 
 * @returns 
 */
export function fieldInput(field: FieldName, actid: string): FieldInput {
    switch (field) {
        case "name":
        case "desc":
            return {
                "type": "plain_text_input",
                "action_id": actid,
                "initial_value": field === "name" ? undefined : "",
                "placeholder": ptext(field),
            };
        case "importance":
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
            };
        default:
            throw new Error("Invalid field");
    }
}