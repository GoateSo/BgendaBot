import { MessageAttachment, RespondArguments } from "@slack/bolt";
import { Schema } from "./types";

// colors for different importance levels
const colors = [
    "#35373b", // default/min   (0) 
    "#36a64f", // low           (1)
    "#daa038", // medium        (2)
    "#a30200", // high          (3)
]

function getColor(importance: string) {
    const imp = Number.parseInt(importance);
    if (isNaN(imp) || imp < 0 || imp > 3) throw new Error(`importance level ${importance} is not valid`);
    return colors[imp];
}

export function formatItems(xs: Schema[]): RespondArguments {
    const attachments: MessageAttachment[] = [];
    for (const [key, { name, importance, desc }] of xs.entries()) {
        // don't add a new line for description if there is none
        const ndesc = desc.trim() === "" ? "" : `\n description: ${desc}`;
        attachments.push({
            text: `${key + 1}. ${name}${ndesc}`,
            color: getColor(importance),
        });
    }
    // if there are no items, add a default message
    if (attachments.length == 0) {
        attachments.push({
            text: `nothing has to be done :D`,
            color: "#ffffff",
        });
    }
    // format in a slack-friendly way
    return {
        blocks: [{
            type: "header",
            text: {
                type: "plain_text",
                text: "Current Agenda Items:",
                emoji: true
            }
        }],
        attachments: attachments
    }
}

