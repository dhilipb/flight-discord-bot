const axios = require('axios');
const fs = require('fs');
const { EmbedBuilder } = require('discord.js');

const DASH = '=';

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
    if (!percent) {
        return '';
    }

    const totalBars = 15;

    const progress = (percent * totalBars) / 100;
    const before = Math.max(progress - 1, 0);
    const after = totalBars - before - 1;

    return DASH.repeat(before) + '✈' + DASH.repeat(after);
}

function getThumbnail(flight) {
    const thumbnails = flight.relatedThumbnails
    const index = Math.floor(Math.random() * thumbnails.length)
    return thumbnails[index].thumbnail
}

const MessageGenerator = {
    get: async (flight) => {
        if (!flight) {
            console.error('No flight found');
            return null;
        }

        const status = flight.flightStatus.toUpperCase() || 'SCHEDULED';

        const embedText = new EmbedBuilder();

        let progress;
        if (status === 'ARRIVED') {
            progress = calculateProgressBar(100);
        } else if (status === 'AIRBORNE') {
            progress = calculateProgressBar((flight.distance.elapsed / (flight.distance.elapsed + flight.distance.remaining)) * 100);
        }

        if (progress) {
            embedText.setDescription(`**${flight.origin.iata} ${progress} ${flight.destination.iata}**`)
        }

        const flightAwareUrl = `https://uk.flightaware.com/live/flight/${flight.ident}`;

        try {
            embedText.setURL(flightAwareUrl)
                .setAuthor({
                    name: `${flight.codeShare.iataIdent} ${flight.codeShare.airline.fullName} Status`,
                    iconURL: flight.thumbnail.imageUrl,
                    url: flightAwareUrl
                })
                .setTitle(status)
                .setDescription(`**${flight.origin.iata} ${progress} ${flight.destination.iata}**`)
                .setThumbnail(getThumbnail(flight))
                .setFields([
                    {
                        name: 'From',
                        value: [
                            `${flight.origin.friendlyLocation} (${flight.origin.iata}) ${getTerminal(flight.origin.terminal) || ''}`,
                            DASH.repeat(28),
                            convertTZ(flight.gateDepartureTimes, flight.origin.TZ),
                            calculateDelay(flight.gateDepartureTimes)
                        ].join('\n')
                    },
                    {
                        name: 'To',
                        value: [
                            `${flight.destination.friendlyLocation} (${flight.destination.iata}) ${getTerminal(flight.destination.terminal) || ''}`,
                            DASH.repeat(28),
                            convertTZ(flight.gateArrivalTimes, flight.destination.TZ),
                            calculateDelay(flight.gateArrivalTimes)
                        ].join('\n')
                    },
                    {
                        name: 'Aircraft',
                        value: flight.aircraft.friendlyType
                    }
                ])
                .setFooter({
                    text: new Date().toISOString()
                });

            embedText.addFields()
            return embedText;
        } catch (e) {
            console.error(e);
            return null;
        }
    }
}

module.exports = MessageGenerator;