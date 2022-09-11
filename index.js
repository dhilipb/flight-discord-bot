require('dotenv').config();
const { initBot } = require('./src/commands');

const TrackManager = require('./src/track-manager');
const DiscordClient = require('./src/discord-client');

if (!process.env.BOT_TOKEN || process.env.BOT_CLIENT) {
    console.error('BOT_TOKEN and BOT_CLIENT are required');
    return;
}

DiscordClient.on('ready', async () => {
    initBot();
    console.log(`Logged in as ${DiscordClient.user.tag}!`);

    await TrackManager.trackToday();
    setInterval(async () => {
        await TrackManager.trackToday();
    }, 60 * 3 * 1000);
});


DiscordClient.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ping') {
        await interaction.reply('Pong!');
    } else if (commandName === 'track') {
        await TrackManager.addToTrack(interaction);
        await TrackManager.trackToday();
    }
});

DiscordClient.login(process.env.BOT_TOKEN);

// process.stdout.write("\u001b[3J\u001b[2J\u001b[1J");
// console.clear();