import { View } from "@slack/bolt";
import { itemsToOptions, ptext } from "../../utils/commandModals";

export const remModal = async (): Promise<View> => {
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
    };
}