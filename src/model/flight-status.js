const FlightStatus = {
    Arrived: 'ARRIVED',
    Airborne: 'AIRBORNE',
    Cancelled: 'CANCELLED',
    Scheduled: 'SCHEDULED',

    isArrived: status => status?.toUpperCase() === FlightStatus.Arrived,
    isAirborne: status => status?.toUpperCase() === FlightStatus.Airborne,
    isCancelled: status => status?.toUpperCase() === FlightStatus.Cancelled,
    isScheduled: status => status?.toUpperCase() === FlightStatus.Scheduled || status?.toUpperCase() === ""
}

module.exports = FlightStatus;