const { SlashCommandBuilder, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');

const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Replies with pong!'),
    new SlashCommandBuilder().setName('track')
        .setDescription('Track a flight for a date')
        .addStringOption(option =>
            option.setName('tail')
                .setDescription('Flight tail name')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('date')
                .setDescription('Date of flight. Format: D/M/YYYY (1/1/2022)')
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