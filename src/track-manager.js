const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

const FlightRetriever = require('./flight-retriever');
const MessageGenerator = require('./message-generator');
const DiscordClient = require('./discord-client');
const CacheManager = require('./cache-manager');
const FlightStatus = require('./model/flight-status');

dayjs.extend(customParseFormat);

const TrackManager = {
    addToTrack: async (interaction) => {
        const trackTail = interaction.options.get('tail').value.toUpperCase();
        const trackTag = interaction.options.get('tag')?.value;
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
            trackTail,
            trackDate,
            trackTag
        };

        if (!await FlightRetriever.search(trackTail)) {
            await interaction.reply(`Couldn't find tail "${trackTail}"`);
            return;
        }

        if (trackDate === 'today' || !trackDate) {
            store.trackDate = dayjs().format('D/M/YYYY');
        }

        if (trackTag) {
            await interaction.reply(`Your flight **${store.trackTail.toUpperCase()}** at ${store.trackDate} tagged **${trackTag}** has been added to tracking`);
        } else {
            await interaction.reply(`Your flight **${store.trackTail.toUpperCase()}** at ${store.trackDate} has been added to tracking`);
        }

        CacheManager.store(store);
    },
    trackToday: async () => {
        const flightsToday = CacheManager.getToday();

        for (const flightStore of flightsToday) {

            const oldFlight = flightStore.flight;
            const oldFlightStatus = oldFlight?.flightStatus?.toUpperCase();

            if ([FlightStatus.Cancelled, FlightStatus.Arrived].includes(oldFlightStatus)) {
                CacheManager.delete(flightStore.trackTail, flightStore.trackDate);
                continue;
            }

            const lotOfTimeToFly = dayjs(oldFlight?.gateDepartureTimes?.scheduled * 1000).isAfter(dayjs().add(1, 'hour'));
            if (FlightStatus.isScheduled(oldFlightStatus) && lotOfTimeToFly) {
                // Do not update if we still have a long time for the flight
                continue;
            }

            const flight = await FlightRetriever.get(flightStore.trackTail);
            if (!flight) {
                continue;
            }

            flightStore.flight = flight;

            const replyText = await MessageGenerator.get(flight, flightStore.trackTag);
            if (!replyText) {
                console.error('No reply text found');
                return;
            }

            const guild = DiscordClient.guilds.cache.get(flightStore.guildId);
            const channel = guild.channels.cache.get(flightStore.channelId);

            const shouldUpdateMessage = flightStore.replyId && (flight.flightStatus === oldFlight?.flightStatus || FlightStatus.isScheduled(oldFlightStatus));
            if (shouldUpdateMessage) {
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
    },

    quickCheck: async (interaction) => {
        const trackTail = interaction.options.get('tail').value.toUpperCase();
        if (!trackTail) {
            console.error("Tail not found!");
            return;
        }

        try {
            const flight = await FlightRetriever.get(trackTail);
            if (!flight) {
                console.error("Flight not found!");
                await interaction.reply(`Couldn't find tail "${trackTail}"`);
                return;
            }

            const replyText = await MessageGenerator.get(flight);
            if (!replyText) {
                await interaction.reply(`Couldn't find tail "${trackTail}"`);
            }

            await interaction.reply({ embeds: [replyText] });
        } catch (e) {
            console.error(e);
            await interaction.reply('Error in server. Please try again later');
        }
    }
}

module.exports = TrackManager;