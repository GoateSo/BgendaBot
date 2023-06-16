# WIP Slack bot for Agenda creation

made in typescript primarily with slack bolt. 

## From the Ground up

1. install node-js
    - you can do so from [here](https://nodejs.org/en) via the node website
    - you can do so via a tool like [nvm](https://github.com/coreybutler/nvm-windows)(windows version here)
2. install [typescript](https://www.npmjs.com/package/typescript) following the steps there (stable build is good)
3. for a local instance of the bot: also install [redis](https://redis.io/download/) and a tool like [ngrok](https://ngrok.com/) (redis will have to be run in WSL on Windows, so make sure that is installed and enabled)
4. start an ngrok instance with `ngrok http 3000`, and also [start redis](https://redis.io/docs/getting-started/installation/)

## Installation

run `npm install` to install dependencies. make sure you have typescript installed.

## Usage

create and modify a `.env` file with the following variables:

```
SLACK_SIGNING_SECRET = you slack signing secret
SLACK_BOT_TOKEN = your slack bot token
PORT = the port you want to run the bot on (default if not specified is 3000)
```

then run `npm start` to start the bot.

### Commands

```
/additem - adds an agenda item with an optional importance level and added info
/remitem - removes an agenda item
/listitems - lists all agenda items in order of importance and then in insertion order
/clearitems - clears all agenda items
/update - updates an agenda item's importance level or added info
/help - lists all commands and their descriptions
```