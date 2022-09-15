const { EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');

dayjs.extend(relativeTime);

const FlightStatus = require('./model/flight-status');

const DASH = '=';

function getFlightTimeInfo(times, tz) {
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

    return DASH.repeat(before) + '✈' + DASH.repeat(after);
}

function getThumbnail(flight) {
    const thumbnails = flight.relatedThumbnails
    const index = Math.floor(Math.random() * thumbnails.length)
    return thumbnails[index].thumbnail
}


function getTimeText(flight) {
    const status = flight.flightStatus;

    let timeText;
    if (FlightStatus.compare(status, FlightStatus.AIRBORNE)
        || FlightStatus.compare(status, FlightStatus.ARRIVED)) {
        const time = (flight.gateArrivalTimes.actual || flight.gateArrivalTimes.estimated || flight.gateArrivalTimes.scheduled) * 1000;
        timeText = dayjs(time).fromNow();
    } else if (FlightStatus.compare(status, FlightStatus.SCHEDULED) || status === '') {
        const time = (flight.gateDepartureTimes.actual || flight.gateDepartureTimes.estimated || flight.gateDepartureTimes.scheduled) * 1000;
        console.log(flight.gateDepartureTimes);
        timeText = dayjs(time).fromNow();
    }

    return timeText;
}

const MessageGenerator = {
    get: async (flight) => {
        if (!flight) {
            console.error('No flight found');
            return null;
        }

        const status = flight.flightStatus.toUpperCase() || FlightStatus.SCHEDULED;

        const embedText = new EmbedBuilder();

        let progress = calculateProgressBar(0);
        if (FlightStatus.compare(status, FlightStatus.ARRIVED)) {
            progress = calculateProgressBar(100);
        } else if (FlightStatus.compare(status, FlightStatus.AIRBORNE)) {
            progress = calculateProgressBar((flight.distance.elapsed / (flight.distance.elapsed + flight.distance.remaining)) * 100);
        }

        const flightAwareUrl = `https://uk.flightaware.com/live/flight/${flight.ident}`;

        try {

            const timeText = getTimeText(flight);

            const description = [
                `**${flight.origin.iata} ${progress} ${flight.destination.iata}**`,
                timeText
            ].filter(x => !!x).join('\n');

            embedText.setURL(flightAwareUrl)
                .setAuthor({
                    name: `${flight.codeShare.iataIdent} ${flight.codeShare.airline.fullName} Status`,
                    iconURL: flight.thumbnail.imageUrl,
                    url: flightAwareUrl
                })
                .setTitle(status)
                .setDescription(description)
                .setThumbnail(getThumbnail(flight))
                .setFields([
                    {
                        name: 'From',
                        value: [
                            `${flight.origin.friendlyLocation} (${flight.origin.iata}) ${getTerminal(flight.origin.terminal) || ''}`,
                            DASH.repeat(28),
                            getFlightTimeInfo(flight.gateDepartureTimes, flight.origin.TZ),
                            calculateDelay(flight.gateDepartureTimes)
                        ].join('\n')
                    },
                    {
                        name: 'To',
                        value: [
                            `${flight.destination.friendlyLocation} (${flight.destination.iata}) ${getTerminal(flight.destination.terminal) || ''}`,
                            DASH.repeat(28),
                            getFlightTimeInfo(flight.gateArrivalTimes, flight.destination.TZ),
                            calculateDelay(flight.gateArrivalTimes)
                        ].join('\n')
                    },
                    {
                        name: 'Aircraft',
                        value: flight.aircraft.friendlyType
                    }
                ])
                .setTimestamp();

            if (FlightStatus.compare(status, FlightStatus.AIRBORNE)) {
                embedText.setFooter({
                    text: "Alt: " + (flight.altitude * 100).toLocaleString() + 'ft, Speed: ' + (flight.groundspeed || 0) + 'mph'
                })
            }

            return embedText;
        } catch (e) {
            console.error(e);
            return null;
        }
    }
}

module.exports = MessageGenerator;