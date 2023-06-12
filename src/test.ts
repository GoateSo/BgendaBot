// import { fieldInput } from './utils/commandModals';
// import { update } from './utils/db';
// import './utils/env';
// import { App, LogLevel } from '@slack/bolt';
// import { isSucc } from './utils/types';
// const app = new App({
//     token: process.env.SLACK_BOT_TOKEN,
//     signingSecret: process.env.SLACK_SIGNING_SECRET,
//     logLevel: LogLevel.DEBUG,
// });
// app.use(async ({ next }) => {
//     await next();
// });

// app.command('/updatedesc', async ({ ack, client, body }) => {
//     await ack();
//     await client.views.open({
//         trigger_id: body.trigger_id,
//         callback_id: "update_desc",
//         view: await initEditModal()
//     });
// });

// app.action('EditItem', async ({ ack }) => {
//     await ack();
// });

// app.action('EditField', async ({ ack, body, client }) => {
//     await ack();
//     if (body.type !== 'block_actions' || !body.view) {
//         return;
//     }
//     const values = body.view.state.values;
//     const item = values?.ItemBlock?.EditItem?.selected_option?.text.text;
//     const field = values?.FieldBlock?.EditField?.selected_option?.value;
//     if (!field || !item)
//         return;
//     await client.views.update({
//         view_id: body.view.id,
//         hash: body.view.hash,
//         view: {
//             private_metadata: JSON.stringify({ item: item, field: field }),
//             type: "modal",
//             callback_id: "updatedUpdate",
//             title: {
//                 type: "plain_text",
//                 text: "Update Description",
//                 emoji: true
//             },
//             blocks: [
//                 {
//                     type: "section",
//                     text: {
//                         type: "plain_text",
//                         text: `editing ${field} of ${item} `,
//                     }
//                 },
//                 {
//                     type: "input",
//                     block_id: `updateBlock`,
//                     element: fieldInput(field, "updateInput"),
//                     label: {
//                         type: "plain_text",
//                         text: `new ${field}`,
//                         emoji: true
//                     }
//                 }
//             ]
//         }
//     });
// });

// app.view('updatedUpdate', async ({ ack, view, client, body }) => {
//     await ack();
//     const values = view.state.values;
//     console.log(values);
//     const { item, field } = JSON.parse(view.private_metadata) as { item: string, field: string };
//     const nval = values?.updateBlock?.updateInput?.value;
//     if (!nval) {
//         console.error("no new value");
//         return;
//     }
//     const res = await update(item, field, nval);
//     if (!isSucc(res)) {
//         console.error(res.left);
//         return;
//     }
//     await client.chat.postMessage({
//         channel: body.user.id,
//         text: `updated ${field} of ${item} to ${nval}`
//     });
// });

// (async () => {
//     await app.start(Number(process.env.PORT) || 3000);
//     console.log('⚡️ Bolt app is running!');
// })();
