const axios = require('axios');

const FlightRetriever = {
    search: async tail => {
        const searchResponse = (await axios.get(`https://e1.flightcdn.com/ajax/ignoreall/omnisearch/flight.rvt?v=50&searchterm=${tail}`)).data;
        const data = searchResponse.data;
        if (!data.length || data[0].description.toLowerCase() === 'Unknown Owner') {
            return null;
        }
        if (data.length === 1) {
            return data;
        } 
        return data.find(row => row.major_airline === '1')
    },
    get: async tail => {
        const flightSearch = await FlightRetriever.search(tail);
        if (!flightSearch) {
            console.error(`Flight ${tail} does not exist`);
            return '';
        }

        const flightAwareUrl = `https://uk.flightaware.com/live/flight/${flightSearch.ident}`;
        const html = (await axios.get(flightAwareUrl)).data;

        let data;
        if (html.includes('trackpollBootstrap')) {
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

        console.error(`Flight ${tail} does not exist`);

        return null;
    }
}

module.exports = FlightRetriever;