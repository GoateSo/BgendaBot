import { MessageAttachment, RespondArguments } from "@slack/bolt";
import { AgendaItem, fromStr, isValidImportance } from "./types";

// colors for different importance levels
const colors = [
    "#35373b", // default/min   (0) 
    "#36a64f", // low           (1)
    "#daa038", // medium        (2)
    "#a30200", // high          (3)
]
function getColor(importance: string) {
    let imp = Number.parseInt(importance);
    if (!isValidImportance(importance)) throw new Error(`importance level ${importance} is not valid (doesn't exist)`);
    // given as string
    if (isNaN(imp)) imp = fromStr(importance);
    // out of range
    if (imp < 0 || imp > 3) throw new Error(`importance level ${importance} is not valid (out of range)`);
    return colors[imp]
}

/**
 * Formats a list of items into a slack-friendly format
 * @param xs list of items, given as a schema array (w/ name, desc, importance, and time of insertion)
 * @returns slack-friendly format of items as a `ResponseArguments` object
 */
export function formatItems(xs: AgendaItem[]): RespondArguments {
    // create an attachment for each item in agenda
    const attachments: MessageAttachment[] = [];
    for (const [i, { name, importance, desc, due_date, assignees }] of xs.entries()) {
        // don't add a new line for optional fields if they weren't provided
        const ndesc = desc.trim() === "" ? "" : `\n description: ${desc}`;
        const ndate = due_date.trim() === "" ? "" : `\n due: ${due_date}`;
        const nassn = assignees.length === 0 ? "" : `\n assigned to: ${assignees.map(a => `<@${a}>`).join(", ")}`;

        attachments.push({
            text: `${i + 1}. ${name}${ndesc}${ndate}${nassn}`,
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

