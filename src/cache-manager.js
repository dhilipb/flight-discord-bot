const fs = require('fs');
const dayjs = require('dayjs');

const fileName = 'cache/cache.json';

if (!fs.existsSync(fileName)) {
    fs.writeFileSync(fileName, '[]');
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
            cache[store.trackTail + '-' + store.trackDate] = store;
            fs.writeFileSync(fileName, JSON.stringify(cache, null, 4));
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
        
        return todaysFlights;
    }
}

module.exports = CacheManager;