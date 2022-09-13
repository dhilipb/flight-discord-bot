const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

const FlightRetriever = require('./flight-retriever');
const MessageGenerator = require('./message-generator');
const DiscordClient = require('./discord-client');
const CacheManager = require('./cache-manager');

dayjs.extend(customParseFormat);

const TrackManager = {
    addToTrack: async (interaction) => {
        const trackTail = interaction.options.get('tail').value.toUpperCase();
        let trackDate = interaction.options.get('date')?.value;

        if (!trackTail) {
            console.error("Tail not found!");
            return;
        }

        if (trackDate && trackDate.includes("/")) {
            const [day, month, year] = trackDate.split("/");

            const currentYear = new Date().getFullYear();
            const dateResolved = dayjs(`${year || currentYear}-${month}-${day}`);

            if (!dateResolved.isValid()) {
                await interaction.reply(`Invalid date **${trackDate}**. Use format D/M/YYYY or D/M`);
                return;
            }

            trackDate = dateResolved.format('D/M/YYYY');
        }

        const store = {
            channelId: interaction.channelId,
            guildId: interaction.guildId,
            replyId: '',
            flight: {},
            trackTail,
            trackDate
        };

        if (!await FlightRetriever.search(trackTail)) {
            await interaction.reply(`Couldn't find tail "${trackTail}"`);
            return;
        }

        if (trackDate === 'today' || !trackDate) {
            store.trackDate = dayjs().format('D/M/YYYY');
        }

        await interaction.reply(`Your flight **${store.trackTail.toUpperCase()}** at ${store.trackDate} has been added to tracking`);

        CacheManager.store(store);
    },
    trackToday: async () => {
        const flightsToday = CacheManager.getToday();

        for (const flightStore of flightsToday) {
            const guild = DiscordClient.guilds.cache.get(flightStore.guildId);
            const channel = guild.channels.cache.get(flightStore.channelId);

            const oldFlight = flightStore.flight;

            if (['CANCELLED', 'ARRIVED'].includes(oldFlight.flightStatus?.toUpperCase())) {
                CacheManager.delete(flightStore.trackTail, flightStore.trackDate);
                continue;
            }

            const flight = await FlightRetriever.get(flightStore.trackTail);
            if (!flight) {
                continue;
            }

            flightStore.flight = flight;

            const replyText = await MessageGenerator.get(flight);
            if (!replyText) {
                console.error('No reply text found');
                return;
            }

            const shouldReply = flightStore.replyId && flight.flightStatus === oldFlight?.flightStatus;
            if (shouldReply) {
                const message = await channel.messages.fetch(flightStore.replyId);
                console.log('Updating message', flightStore.trackTail);
                message.edit({ embeds: [replyText] });
            } else {
                const message = await channel.send({ embeds: [replyText] });
                console.log('Sending message', flightStore.trackTail);
                flightStore.replyId = message.id;
            }

            CacheManager.store(flightStore);
        }
    }
}

module.exports = TrackManager;