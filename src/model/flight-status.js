module.exports = {
    ARRIVED: 'ARRIVED',
    AIRBORNE: 'AIRBORNE',
    CANCELLED: 'CANCELLED',
    SCHEDULED: 'SCHEDULED',
    compare: (a, b) => a?.toUpperCase() === b?.toUpperCase() && a !== null && b !== null
}