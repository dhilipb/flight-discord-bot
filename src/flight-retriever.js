const axios = require('axios');
const dayjs = require('dayjs');

const FLIGHTAWARE_DOMAIN = 'https://uk.flightaware.com';

const FlightRetriever = {
    search: async tail => {
        const searchResponse = (await axios.get(`https://e1.flightcdn.com/ajax/ignoreall/omnisearch/flight.rvt?v=50&searchterm=${tail}`))?.data;
        const data = searchResponse?.data;
        if (!data || !data.length || data[0].description.toLowerCase() === 'Unknown Owner') {
            return null;
        }
        if (data.length === 1) {
            return data[0];
        }
        return data.find(row => row.major_airline === '1')
    },
    get: async (tail) => {

        const flightSearch = await FlightRetriever.search(tail);
        if (!flightSearch) {
            console.error(`Flight ${tail} does not exist`);
            return '';
        }

        flightAwareUrl = `${FLIGHTAWARE_DOMAIN}/live/flight/${flightSearch.ident}`;

        let flight = await FlightRetriever.getByUrl(flightAwareUrl);

        const isOldFlight = dayjs(flight.gateDepartureTimes?.scheduled).isBefore(dayjs());
        if (isOldFlight) {
            const yyyymmdd = dayjs().format('YYYYMMDD');
            const permanentUrl = FLIGHTAWARE_DOMAIN + flight.links.permanent.replace(/history\/\d+/, 'history/' + yyyymmdd);
            console.log('Found old flight, finding new flight', permanentUrl);
            flight = await FlightRetriever.getByUrl(permanentUrl);
        }

        return flight;
    },

    getByUrl: async flightAwareUrl => {
        const html = (await axios.get(flightAwareUrl))?.data;

        let data;
        if (html?.includes('trackpollBootstrap')) {
            data = html.match(/trackpollBootstrap = (.+)/)[1];
            data = data.substr(0, data.length - 10);
            data = JSON.parse(data);
        }

        if (data) {
            const flightId = Object.keys(data.flights)[0];
            const flight = data.flights[flightId];

            delete flight.activityLog;
            delete flight.track;

            const mandatoryFields = [
                flight.origin.iata,
                flight.destination.iata
            ];

            if (mandatoryFields.some(field => !field)) {
                console.error('One or other mandatory fields doesnt exist', mandatoryFields);
                return null;
            }

            return flight;
        }

        return null;
    }
}

module.exports = FlightRetriever;