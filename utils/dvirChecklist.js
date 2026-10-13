/**************************************************************
 * dvirChecklist.js
 * The DVIR checklist's 48 items in one place, keyed like the
 * schema in models/Inspection.js. The CSV export takes its labels
 * from it (utils/inspectionCsv.js).
 *
 * Each section lists the paper form's columns, top to bottom:
 * the order the PDF template prints them in (alphabetical, Other
 * last). formOrder() turns that into the order a grid that fills
 * row by row needs to show the same columns.
 **************************************************************/
const CHECKLIST = {
    truckTractor: [
        [
            { key: 'airCompressor', label: 'Air Compressor' },
            { key: 'airLines', label: 'Air Lines' },
            { key: 'battery', label: 'Battery' },
            { key: 'brakeAccessories', label: 'Brake Accessories' },
            { key: 'brakes', label: 'Brakes' },
            { key: 'carburetor', label: 'Carburetor' },
            { key: 'clutch', label: 'Clutch' },
            { key: 'defroster', label: 'Defroster' },
            { key: 'driveLine', label: 'Drive Line' },
            { key: 'engine', label: 'Engine' },
            { key: 'fifthWheel', label: 'Fifth Wheel' },
            { key: 'frontAxle', label: 'Front Axle' },
            { key: 'fuelTanks', label: 'Fuel Tanks' },
            { key: 'heater', label: 'Heater' },
        ],
        [
            { key: 'horn', label: 'Horn' },
            { key: 'lights', label: 'Lights' },
            { key: 'mirrors', label: 'Mirrors' },
            { key: 'muffler', label: 'Muffler' },
            { key: 'oilPressure', label: 'Oil Pressure' },
            { key: 'onBoardRecorder', label: 'On-Board Recorder' },
            { key: 'radiator', label: 'Radiator' },
            { key: 'rearEnd', label: 'Rear End' },
            { key: 'reflectors', label: 'Reflectors' },
            { key: 'safetyEquipment', label: 'Safety Equipment' },
        ],
        [
            { key: 'springs', label: 'Springs' },
            { key: 'starter', label: 'Starter' },
            { key: 'steering', label: 'Steering' },
            { key: 'tachograph', label: 'Tachograph' },
            { key: 'tires', label: 'Tires' },
            { key: 'transmission', label: 'Transmission' },
            { key: 'wheels', label: 'Wheels' },
            { key: 'windows', label: 'Windows' },
            { key: 'windshieldWipers', label: 'Windshield Wipers' },
            { key: 'other', label: 'Other' },
        ],
    ],
    trailer: [
        [
            { key: 'brakeConnections', label: 'Brake Connections' },
            { key: 'brakes', label: 'Brakes' },
            { key: 'couplingChains', label: 'Coupling Chains' },
            { key: 'couplingPin', label: 'Coupling (King) Pin' },
            { key: 'doors', label: 'Doors' },
        ],
        [
            { key: 'hitch', label: 'Hitch' },
            { key: 'landingGear', label: 'Landing Gear' },
            { key: 'lightsAll', label: 'Lights – All' },
            { key: 'roof', label: 'Roof' },
            { key: 'springs', label: 'Springs' },
        ],
        [
            { key: 'tarpaulin', label: 'Tarpaulin' },
            { key: 'tires', label: 'Tires' },
            { key: 'wheels', label: 'Wheels' },
            { key: 'other', label: 'Other' },
        ],
    ],
}

// A section's items column by column: the paper form's (and the schema's) order
const items = (section) => CHECKLIST[section].flat()

// The same items row by row, for a grid that fills rows: the first of each
// column, then the second of each, and so on, so the screen shows the paper
// form's columns. Once the shorter columns run out, the rest follow in order.
const formOrder = (section) => {
    const columns = CHECKLIST[section]
    const rows = Math.max(...columns.map((column) => column.length))
    const order = []
    for (let row = 0; row < rows; row++) {
        columns.forEach((column) => {
            if (column[row]) {
                order.push(column[row])
            }
        })
    }
    return order
}

// { key: label } in the paper form's order, for the CSV export
const labelsFor = (section) => Object.fromEntries(items(section).map(({ key, label }) => [key, label]))

module.exports = { CHECKLIST, items, formOrder, labelsFor }
