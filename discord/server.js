const express = require("express")
const server = express()

const {Client} = require('discord.js');
const bot = new Client()
require('discord-buttons')(bot);
const dotenv = require('dotenv');
dotenv.config();

const projectId = process.env.PROJECT_ID;
const locationId = process.env.LOCATION_ID;
const agentId = process.env.AGENT_ID;
const languageCode = 'en';
const discordToken = process.env.DISCORD_TOKEN;
let PORT = process.env.PORT || 8080;

bot.login(discordToken);

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`);
});

const structProtoToJson = require('./botlib/proto_to_json.js').structProtoToJson;
const { SessionsClient } = require('@google-cloud/dialogflow-cx');

const client = new SessionsClient({
  apiEndpoint: `${locationId}-dialogflow.googleapis.com`
});

function discordToDetectIntent(discordRequest, sessionPath) {
  return {
    session: sessionPath,
    queryInput: {
      text: {
        text: discordRequest.content,
      },
      languageCode,
    },
  };
}

async function detectIntentResponse(discordRequest) {
  const sessionId = await discordRequest.author.id;
  const sessionPath = client.projectLocationAgentSessionPath(projectId, locationId, agentId, sessionId);
  const request = discordToDetectIntent(discordRequest, sessionPath);

  try {
    const [response] = await client.detectIntent(request);
    return response;
  } catch (error) {
    console.error('Error during detectIntent:', error);
    throw error;
  }
}

async function convertToDiscordMessage(responses) {
  let replies = [];

  for (let response of responses.queryResult.responseMessages) {
    let reply;

    switch (true) {
      case response.hasOwnProperty('text'):
        reply = response.text.text.join();
        break;
      case response.hasOwnProperty('payload'):
        reply = await structProtoToJson(response.payload);
        break;
      default:
    }
    if (reply) {
      replies.push(reply);
    }
  }

  return replies;
}

bot.on('message', async message => {
  if (message.author !== bot.user && !message.author.bot &&
    (message.mentions.users.has(bot.user.id) || message.channel.type === 'dm')) {
    try {
      const responses = await detectIntentResponse(message);
      console.log("Responses===========>\n", responses);
      const requests = await convertToDiscordMessage(responses);
      console.log("Requests===========>\n", requests);

      for (let req of requests) {
        try {
          await message.channel.send(req);
        } catch (error) {
          console.error('Error sending message:', error);
          await message.channel.send(`An error occurred while sending the response: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
      await message.channel.send(`An error occurred while processing your request: ${error.message}`);
    }
  }
});

server.listen(PORT, () => {
  console.log('Your Dialogflow integration server is listening on port ' + PORT);
});

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
});

module.exports = {
  discordToDetectIntent,
  convertToDiscordMessage
};
