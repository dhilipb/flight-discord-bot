const { SlashCommandBuilder, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');

const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Replies with pong!'),
    new SlashCommandBuilder().setName('flights').setDescription('Flights tracked in this channel'),
    new SlashCommandBuilder().setName('check').setDescription('Quick check for a flight tail')
        .addStringOption(option =>
            option.setName('tail')
                .setDescription('Flight tail name')
                .setRequired(true)),
    new SlashCommandBuilder().setName('track').setDescription('Track a flight for a date')
        .addStringOption(option =>
            option.setName('tail')
                .setDescription('Flight tail name')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('date')
                .setDescription('Date of flight. Format: D/M/YYYY (12/9/2022) or D/M (12/9)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('tag')
                .setDescription('Tag this tracking. Perhaps a name.')
                .setRequired(false))
]
    .map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

module.exports.initBot = async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.BOT_CLIENT), {
            body: commands
        });
        console.log('Started refreshing application (/) commands.');
    } catch (e) {
        console.error(e);
    }
};