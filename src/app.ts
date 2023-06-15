import { App, LogLevel } from '@slack/bolt';
import './utils/env';

// Commands
import * as Add from './commands/addItem';
import * as Remove from './commands/remItem';
import * as Clear from './commands/clearItems';
import * as List from './commands/listItems';
import * as Update from './commands/updateItem';
import * as Help from './commands/help';
import { job } from './recurringmsg';


export const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    logLevel: LogLevel.ERROR,
});

app.use(async ({ next }) => {
    await next();
});

// initalize all commands:
// in future: perhaps use node-dir to do this instead of import
Add.init();
Remove.init();
Clear.init();
List.init();
Update.init();
Help.init();

(async () => {
    await app.start(Number(process.env.PORT) || 3000);
    console.log('⚡️ Bolt app is running!');
    job.invoke();
})();
