const { EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
const updateLocale = require('dayjs/plugin/updateLocale');

dayjs.extend(relativeTime);
dayjs.extend(updateLocale)

dayjs.updateLocale('en', {
    relativeTime: {
        future: "in %s",
        past: "%s ago",
        s: "a few seconds",
        m: "%d seconds",
        mm: "%d minutes",
        h: "%d minutes",
        hh: "%d hours",
        d: "%d hours",
        dd: "%d days",
        M: "%d days",
        MM: "%d months",
        y: "%d months",
        yy: "%d years"
    }
})

const FlightStatus = require('./model/flight-status');

const DASH = '=';

function getFlightTimeInfo(times, tz) {
    tz = tz.replace(':', '');
    const scheduledTime = new Date(times.scheduled * 1000).toLocaleString("en-US", { timeZone: tz });
    const estimatedTime = new Date(times.estimated * 1000).toLocaleString("en-US", { timeZone: tz });
    const actualTime = new Date(times.actual * 1000).toLocaleString("en-US", { timeZone: tz });
    return [
        `Estimated Time: ${estimatedTime}`,
        `Scheduled Time: ${scheduledTime}`,
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

    if (Math.abs(times.scheduled) === times.scheduled) {
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
    const thumbnails = flight.relatedThumbnails;
    if (thumbnails?.length) {
        const index = Math.floor(Math.random() * thumbnails.length)
        return thumbnails[index].thumbnail
    }

    return null;
}


function getTimeText(flight) {
    const status = flight.flightStatus;

    if (FlightStatus.isAirborne(status)) {
        const time = (flight.gateArrivalTimes.actual || flight.gateArrivalTimes.estimated || flight.gateArrivalTimes.scheduled) * 1000;
        return 'Landing ' + dayjs(time).fromNow();
    } else if (FlightStatus.isScheduled(status)) {
        const time = (flight.gateDepartureTimes.actual || flight.gateDepartureTimes.estimated || flight.gateDepartureTimes.scheduled) * 1000;
        return 'Take off ' + dayjs(time).fromNow();
    }

    return '';
}

const MessageGenerator = {
    get: async (flight, trackTag = null) => {
        if (!flight) {
            console.error('No flight found');
            return null;
        }

        const status = flight.flightStatus.toUpperCase() || FlightStatus.Scheduled;

        const embedText = new EmbedBuilder();

        let progress = calculateProgressBar(0);
        if (FlightStatus.isArrived(status)) {
            progress = calculateProgressBar(100);
        } else if (FlightStatus.isAirborne(status)) {
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
                .setTitle(status + (trackTag ? ` - ${trackTag}` : ""))
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

            if (FlightStatus.isAirborne(status)) {
                embedText.setFooter({
                    text: "Alt: " + (flight.altitude * 100).toLocaleString() + 'ft, Speed: ' + (flight.groundspeed || 0) + 'mph'
                })
            }

            return embedText;
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    getAllFlights: (flights) => {
        let message = '';

        for (const [index, flight] of flights.entries()) {
            if (flight.flight) {
                message += [
                    `${index + 1}) **${flight.trackTail}** on ${flight.trackDate}`,
                    `${flight.flight.flightStatus.toUpperCase()} ${flight.trackTag ? ` - ${flight.trackTag}` : ''}`,
                    `${flight.flight.origin.iata} => ${flight.flight.destination.iata}`
                ].join('\n') + '\n\n';
            }
        }

        return message || 'No flights available';
    }
}

module.exports = MessageGenerator;
