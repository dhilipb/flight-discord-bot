const axios = require('axios');
const fs = require('fs');
const { EmbedBuilder } = require('discord.js');

function convertTZ(times, tz) {
    tz = tz.replace(':', '');
    const scheduledTime = new Date(times.scheduled * 1000).toLocaleString("en-US", { timeZone: tz });
    const estimatedTime = new Date(times.estimated * 1000).toLocaleString("en-US", { timeZone: tz });
    const actualTime = new Date(times.actual * 1000).toLocaleString("en-US", { timeZone: tz });
    return [
        `Estimated Time: ${scheduledTime}`,
        `Scheduled Time: ${estimatedTime}`,
        `Actual Time: ${actualTime}`
    ]
        .filter(line => line && !line.includes('1970'))
        .join('\n');
}

function calculateDelay(times) {
    const difference = (times.actual || times.estimated) - times.scheduled;
    const time = Math.abs((difference / 60));
    if (time === 0) {
        return '';
    }

    return time + ' mins ' + (difference > 0 ? 'late' : 'early');
}

function getTerminal(terminal) {
    return terminal ? `- T${terminal}` : '';
}

function calculateProgressBar(percent) {
    const totalBars = 15;

    const progress = (percent * totalBars) / 100;
    const before = Math.max(progress - 1, 0);
    const after = totalBars - before - 1;

    return '-'.repeat(before) + '✈' + '-'.repeat(after);
}

const MessageGenerator = {
    get: async (flight) => {
        if (!flight) {
            return null;
        }

        const status = flight.flightStatus.toUpperCase() || 'SCHEDULED';

        let progress;
        if (status === 'ARRIVED') {
            progress = calculateProgressBar(100);
        } else if (status === 'AIRBORNE') {
            progress = calculateProgressBar((flight.distance.elapsed / (flight.distance.elapsed + flight.distance.remaining)) * 100);
        } else {
            progress = calculateProgressBar(0);
        }

        const flightAwareUrl = `https://uk.flightaware.com/live/flight/${flight.ident}`;

        const embedText = new EmbedBuilder()
            .setURL(flightAwareUrl)
            .setAuthor({
                name: `${flight.codeShare.iataIdent} ${flight.codeShare.airline.fullName} Status`,
                iconURL: flight.thumbnail.imageUrl,
                url: flightAwareUrl
            })
            .setTimestamp()
            .setTitle(status)
            .setDescription(`**${flight.origin.iata} ${progress} ${flight.destination.iata}**`)
            .setThumbnail(flight.relatedThumbnails[0].thumbnail)
            .setFields([
                {
                    name: 'From',
                    value: [
                        `${flight.origin.friendlyLocation} (${flight.origin.iata}) ${getTerminal(flight.origin.terminal)}`,
                        '-'.repeat(flight.origin.friendlyLocation.),
                        convertTZ(flight.gateDepartureTimes, flight.origin.TZ),
                        calculateDelay(flight.gateDepartureTimes)
                    ].join('\n')
                },
                {
                    name: 'To',
                    value: [
                        `${flight.destination.friendlyLocation} (${flight.destination.iata}) ${getTerminal(flight.destination.terminal)}`,
                        '-'.repeat(20),
                        convertTZ(flight.gateArrivalTimes, flight.destination.TZ),
                        calculateDelay(flight.gateArrivalTimes)
                    ].join('\n')
                },
                {
                    name: 'Aircraft',
                    value: [
                        flight.aircraft.friendlyType
                    ].join('\n')
                }
            ]);

        return embedText;
    }
}

module.exports = MessageGenerator;