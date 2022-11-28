const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');

const fileName = 'cache/cache.json';
const FlightStatus = require('./model/flight-status');

if (!fs.existsSync(fileName)) {
    fs.mkdirSync(path.basename(path.dirname(fileName)));
    fs.writeFileSync(fileName, '{}');
}

const CacheManager = {
    retrieve: () => {
        try {
            const raw = fs.readFileSync(fileName).toString() || '{}';
            const cache = JSON.parse(raw);
            return cache;
        } catch (e) {
            return {};
        }
    },
    getKey: (store) => {
        const cacheKey = [
            store.channelId,
            store.guildId,
            store.trackTail,
            store.trackDate,
            store.trackTag
        ].filter(x => x).join('-');
        return cacheKey;
    },
    store: (store) => {
        console.log('Adding to cache');
        if (!store.trackTail || !store.trackDate) {
            console.error('Could not add to cache', store);
            return;
        }

        try {
            const cache = CacheManager.retrieve();
            const cacheKey = CacheManager.getKey(store);

            console.log('Storing as', cacheKey);
            cache[cacheKey] = store;
            fs.writeFileSync(fileName, JSON.stringify(cache, null, 4));
        } catch (e) {
            console.error(e);
        }
    },
    delete: (store) => {
        try {
            const cacheKey = CacheManager.getKey(store);
            console.log('Deleting', cacheKey);
            if (cacheKey) {
                const cache = CacheManager.retrieve();
                delete cache[cacheKey];
                fs.writeFileSync(fileName, JSON.stringify(cache, null, 4));
            }
        } catch (e) {
            console.error(e);
        }
    },
    cleanup: () => {
        const cache = CacheManager.retrieve();
        Object.values(cache).forEach(item => {
            const flightStatus = item.flight?.flightStatus?.toUpperCase();
            if ([FlightStatus.Cancelled, FlightStatus.Arrived].includes(flightStatus)) {
                CacheManager.delete(item);
            }
        });
    },
    getToday: () => {
        console.log('Retrieving todays flight');

        const cache = CacheManager.retrieve();
        const todaysFlights = Object.values(cache).filter(item => {
            return item.trackDate === dayjs().format('D/M/YYYY');
        });

        console.log('Found', todaysFlights.length, 'flights');

        CacheManager.cleanup();

        return todaysFlights;
    }
}

module.exports = CacheManager;