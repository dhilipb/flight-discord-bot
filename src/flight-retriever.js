const axios = require('axios');

const FlightRetriever = {
    search: async tail => {
        const searchResponse = (await axios.get(`https://e1.flightcdn.com/ajax/ignoreall/omnisearch/flight.rvt?v=50&searchterm=${tail}`)).data;
        const flightSearch = searchResponse.data.length === 1 ? searchResponse.data[0] : searchResponse.data.find(row => row.major_airline === '1');
        return flightSearch;
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

            return flight;
        }

        console.error(`Flight ${tail} does not exist`);

        return null;
    }
}

module.exports = FlightRetriever;