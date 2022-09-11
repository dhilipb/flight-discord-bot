
const { Client, GatewayIntentBits, Partials } = require('discord.js');

module.exports = new Client({
    partials: [Partials.Message, Partials.Channel],
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});