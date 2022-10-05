const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');

const fileName = 'cache/cache.json';

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
    store: (store) => {
        console.log('Adding to cache');
        if (!store.trackTail || !store.trackDate) {
            console.error('Could not add to cache', store);
            return;
        }

        try {
            const cache = CacheManager.retrieve();
            const cacheKey = [
                store.channelId,
                store.guildId,
                store.trackTail,
                store.trackDate,
                store.trackTag
            ].filter(x => x).join('-');

            console.log('Storing as', cacheKey);
            cache[cacheKey] = store;
            fs.writeFileSync(fileName, JSON.stringify(cache, null, 4));
        } catch (e) {
            console.error(e);
        }
    },
    delete: (tail, date) => {
        try {
            console.log('Deleting', tail, date);
            if (tail && date) {
                const cache = CacheManager.retrieve();
                delete cache[tail + '-' + date];
                fs.writeFileSync(fileName, JSON.stringify(cache, null, 4));
            }
        } catch (e) {
            console.error(e);
        }
    },
    getToday: () => {
        console.log('Retrieving todays flight');

        const cache = CacheManager.retrieve();
        const todaysFlights = Object.values(cache).filter(item => {
            return item.trackDate === dayjs().format('D/M/YYYY');
        });

        console.log('Found', todaysFlights.length, 'flights');

        return todaysFlights;
    }
}

module.exports = CacheManager;