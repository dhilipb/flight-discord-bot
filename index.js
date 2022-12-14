require('dotenv').config();
const { initBot } = require('./src/commands');

const TrackManager = require('./src/track-manager');
const DiscordClient = require('./src/discord-client');

if (!process.env.BOT_TOKEN || !process.env.BOT_CLIENT) {
    console.error('BOT_TOKEN and BOT_CLIENT are required');
} else {
    DiscordClient.on('ready', async () => {
        initBot();
        console.log(`Logged in as ${DiscordClient.user.tag}!`);

        await TrackManager.trackToday();
        setInterval(async () => {
            await TrackManager.trackToday();
        }, (process.env.CHECK_FREQUENCY_MINS || 3) * 60 * 1000);
    });

    DiscordClient.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const { commandName } = interaction;

        if (commandName === 'ping') {
            await interaction.reply('Pong!');
        } else if (commandName === 'track') {
            await TrackManager.addToTrack(interaction);
            await TrackManager.trackToday();
        } else if (commandName === 'check') {
            await TrackManager.quickCheck(interaction);
        } else if (commandName === 'flights') {
            await TrackManager.getAllFlights(interaction);
        }
    });

    DiscordClient.login(process.env.BOT_TOKEN);
}

// Clear console
// process.stdout.write("\u001b[3J\u001b[2J\u001b[1J");
// console.clear();

process.on('uncaughtException', function (err) {
    console.log('Caught exception:', err);
});
