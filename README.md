# WIP Slack bot for Agenda creation

made in typescript primarily with slack bolt, and a bit of fp-ts for result handling. 

## Installation

run `npm install` to install dependencies. make sure you have typescript installed.

## Usage

create and modify a `.env` file with the following variables:

```
SLACK_SIGNING_SECRET = you slack signing secret
SLACK_BOT_TOKEN = your slack bot token
PORT = the port you want to run the bot on (default if not specified is 3000)
```

then run `npm run start` to start the bot.

### Commands

```
/additem <item> - adds an item to the agenda
/remitem <item> - removes an item from the agenda
/listitems - lists all items on the agenda
/clear - clears all items from the agenda
/updateimportance <item_id> <importance> - updates the importance of an item on the agenda
/updatedescription <item_id> <description> - updates the description of an item on the agenda
```