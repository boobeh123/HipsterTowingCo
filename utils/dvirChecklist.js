/**************************************************************
 * dvirChecklist.js
 * The DVIR checklist's 48 items in one place. The inspection form
 * builds its checkboxes and ? notes from it (app.locals in
 * server.js, views/partials/checklistSection.ejs), and the CSV
 * export takes its labels from it (utils/inspectionCsv.js). Keys
 * match the schema in models/Inspection.js.
 *
 * Each section lists the paper form's columns, top to bottom:
 * the order the PDF template prints them in (alphabetical, Other
 * last). formOrder() turns that into the order a grid that fills
 * row by row needs to show the same columns.
 *
 * An item's note, when it has one, holds:
 *   applies  which trucks it's for, when not every truck has the part
 *   where    where the part is, in general terms
 *   check    what to check: each line is something that should be true
 *   more     anything to do beyond ticking the box
 *   remark   an example remark
 *   source   where the method or rule comes from
 *   photo    { src, alt, width, height }, once there's a photo of it
 * The notes are written from the CDL manual (section 2, in our own
 * words) and 49 CFR, and someone with a CDL reviews them before they
 * ship. So far they cover what's checked under the hood and in the
 * cab; the walk-around items come next. Air-brake, fifth wheel and
 * trailer items wait for a reviewer with a Class A license.
 **************************************************************/
const CHECKLIST = {
    truckTractor: [
        [
            { key: 'airCompressor', label: 'Air Compressor' },
            { key: 'airLines', label: 'Air Lines' },
            {
                key: 'battery',
                label: 'Battery',
                note: {
                    where: 'Under the hood on most trucks. Some keep it in a box on the frame, under the cab or behind a step.',
                    check: [
                        'It sits tight in its tray or box, with the hold-down in place and the box cover on.',
                        "The case isn't cracked or leaking.",
                        'The cable ends are tight and free of heavy white or green corrosion.',
                        'If it has removable caps: the fluid is at the right level and every cap is in place.',
                        'Once the engine runs, the charging light goes out and the voltmeter, if there is one, reads normal.',
                    ],
                    remark: 'Battery: hold-down missing, battery slides in its tray.',
                    source: 'CDL manual, section 2',
                },
            },
            { key: 'brakeAccessories', label: 'Brake Accessories' },
            {
                key: 'brakes',
                label: 'Brakes',
                note: {
                    where: "The pedal and parking brake in the cab, the brake fluid reservoir (usually at the back of the engine bay on the driver's side), and the brakes behind each wheel.",
                    check: [
                        "The brake fluid is between the reservoir's MIN and MAX marks.",
                        "Engine running, pump the pedal 3 times, then press firmly for 5 seconds: the pedal doesn't sink.",
                        'Parking brake set, truck in gear, pull forward gently: the parking brake holds.',
                        'At about 5 mph, brake firmly: the truck stops straight, with no pulling and no soft pedal.',
                        'The ABS light goes out right after starting, and the red brake light goes out when you release the parking brake.',
                        'No fluid is leaking at the wheels or from the brake lines.',
                    ],
                    remark: 'Brakes: pedal slowly sinks during the 5-second hold.',
                    source: 'CDL manual, section 2',
                },
            },
            {
                key: 'carburetor',
                label: 'Carburetor',
                note: {
                    applies: 'Most trucks today have fuel injection instead of a carburetor. If yours does, leave this unticked.',
                    check: [
                        'The engine idles smoothly, with no fuel leaking and no fuel smell.',
                    ],
                    remark: 'Carburetor: engine stalls at idle, fuel smell.',
                },
            },
            {
                key: 'clutch',
                label: 'Clutch',
                note: {
                    applies: 'Only on trucks with a manual transmission (a clutch pedal). On an automatic, leave this unticked.',
                    where: 'The pedal to the left of the brake.',
                    check: [
                        'The pedal moves freely and comes back up on its own.',
                        'The clutch engages smoothly, without slipping, grabbing or shuddering.',
                        'Every gear goes in without grinding.',
                    ],
                    remark: 'Clutch: slips under load, engine revs but truck barely speeds up.',
                    source: 'CDL manual, section 2',
                },
            },
            {
                key: 'defroster',
                label: 'Defroster',
                note: {
                    where: 'The vents along the bottom of the windshield, run from the heater and fan controls.',
                    check: [
                        'On the defrost setting, air blows out of the windshield vents at every fan speed.',
                        'It clears fog and frost from the inside of the windshield.',
                    ],
                    remark: 'Defroster: no air from the windshield vents.',
                    source: '49 CFR 393.79',
                },
            },
            { key: 'driveLine', label: 'Drive Line' },
            {
                key: 'engine',
                label: 'Engine',
                note: {
                    where: 'Under the hood, or under the cab on cab-over trucks.',
                    check: [
                        'The oil on the dipstick is between the marks.',
                        'No fresh leaks of oil, coolant or fuel, on the engine or on the ground under it.',
                        'The belts are tight, and not cracked or frayed.',
                        "The wiring isn't cracked, worn through or hanging loose.",
                        'The hood (or cab) closes and latches.',
                    ],
                    remark: 'Engine: oil leaking at front of engine, fresh drips on the ground.',
                    source: 'CDL manual, section 2',
                },
            },
            { key: 'fifthWheel', label: 'Fifth Wheel' },
            { key: 'frontAxle', label: 'Front Axle' },
            { key: 'fuelTanks', label: 'Fuel Tanks' },
            {
                key: 'heater',
                label: 'Heater',
                note: {
                    where: 'The heater and fan controls on the dash.',
                    check: [
                        'Warm air comes out once the engine has warmed up, and the fan works.',
                        'No sweet smell, fogged-up windows or wet floor under the dash. Those mean coolant is leaking from the heater.',
                        'No exhaust fumes or burning smell from the vents.',
                    ],
                    remark: 'Heater: no heat, sweet smell and wet carpet under the dash.',
                },
            },
        ],
        [
            {
                key: 'horn',
                label: 'Horn',
                note: {
                    where: 'Usually the center of the steering wheel.',
                    check: [
                        'It sounds loud and clear every time you press it.',
                    ],
                    remark: 'Horn: does not sound.',
                    source: '49 CFR 393.81',
                },
            },
            { key: 'lights', label: 'Lights' },
            {
                key: 'mirrors',
                label: 'Mirrors',
                note: {
                    where: 'Outside the driver and passenger doors, plus any extra convex or hood mirrors.',
                    check: [
                        "There's one on each side, firmly mounted, not cracked and not loose.",
                        "They're clean, and adjusted so you can see along both sides of the truck to the rear.",
                    ],
                    remark: 'Mirrors: passenger-side mirror loose, vibrates at speed.',
                    source: 'CDL manual, section 2; 49 CFR 393.80',
                },
            },
            { key: 'muffler', label: 'Muffler' },
            {
                key: 'oilPressure',
                label: 'Oil Pressure',
                note: {
                    where: 'The oil pressure gauge or oil warning light on the dash.',
                    check: [
                        'After you start the engine, the gauge comes up to normal within seconds, or the warning light goes out.',
                        'It stays in the normal range at idle and while driving.',
                    ],
                    more: 'If it stays low or the light stays on, shut the engine off and check the oil level before you go anywhere.',
                    remark: 'Oil pressure: gauge low at idle, light flickers.',
                    source: 'CDL manual, section 2',
                },
            },
            {
                key: 'onBoardRecorder',
                label: 'On-Board Recorder',
                note: {
                    applies: 'Only if the truck has an electronic logging device (ELD) for your hours of service.',
                    where: 'The ELD unit and its screen or tablet in the cab.',
                    check: [
                        'It powers on, connects, and shows no malfunction warning.',
                    ],
                    more: "If it malfunctions, tick this box, tell your company in writing within 24 hours, and keep paper logs until it's fixed. If the ELD can't show today's and the past 7 days' logs, rebuild those on paper too.",
                    remark: 'On-board recorder: ELD shows a malfunction, not recording.',
                    source: '49 CFR 395.34',
                },
            },
            {
                key: 'radiator',
                label: 'Radiator',
                note: {
                    where: 'At the front of the engine, behind the grille. Most trucks also have a see-through coolant tank nearby, with level marks.',
                    check: [
                        'The coolant in the tank is at the right level (check it with the engine cold).',
                        "The radiator and hoses aren't leaking, cracked or swollen.",
                        'After you start the engine, the coolant warning light goes out and the temperature gauge rises slowly to normal.',
                    ],
                    more: 'Never open the radiator cap on a hot engine: the coolant is under pressure and can burn you.',
                    remark: 'Radiator: coolant dripping from lower hose, tank below MIN.',
                    source: 'CDL manual, section 2',
                },
            },
            { key: 'rearEnd', label: 'Rear End' },
            { key: 'reflectors', label: 'Reflectors' },
            {
                key: 'safetyEquipment',
                label: 'Safety Equipment',
                note: {
                    where: 'In the cab, often behind or under a seat.',
                    check: [
                        'The fire extinguisher is charged (gauge needle in the green), rated 5 B:C or higher, mounted securely and easy to reach.',
                        'Three reflective warning triangles are on board.',
                        'There are spare fuses, unless the truck uses circuit breakers.',
                        "The seat belt is mounted securely, latches, and isn't ripped or frayed.",
                    ],
                    remark: 'Safety equipment: fire extinguisher gauge in the red.',
                    source: 'CDL manual, section 2; 49 CFR 393.95',
                },
            },
        ],
        [
            { key: 'springs', label: 'Springs' },
            {
                key: 'starter',
                label: 'Starter',
                note: {
                    where: 'On the engine. You test it with the key or start button.',
                    check: [
                        'The engine cranks and starts normally.',
                        'There is no grinding, and no single click without cranking.',
                    ],
                    more: 'Slow cranking can be the starter or the battery, so describe what happened in Remarks.',
                    remark: 'Starter: grinding noise when cranking, took 3 tries.',
                },
            },
            {
                key: 'steering',
                label: 'Steering',
                note: {
                    where: 'The steering wheel in the cab, the power steering reservoir under the hood (its cap often shows a steering wheel), and the steering parts behind the front wheels.',
                    check: [
                        'Free play is small. With the engine running and the wheels straight, turn the wheel until the left front tire just moves, then back the other way. More than about 2 inches at the rim of a 20-inch wheel is too much.',
                        'The power steering fluid is at the right level, with no leaks at the pump or hoses.',
                        'No groaning, binding or shaking as you turn the wheel all the way each way.',
                        'Nothing is loose, bent or missing behind the front wheels.',
                    ],
                    remark: 'Steering: about 3 inches of free play at the wheel.',
                    source: 'CDL manual, section 2',
                },
            },
            {
                key: 'tachograph',
                label: 'Tachograph',
                note: {
                    applies: "A tachograph records speed and driving time, often on a paper disc. Most trucks today don't have one, and your hours go on the ELD (the On-Board Recorder box). If yours doesn't have one, leave this unticked.",
                    check: [
                        'It runs and records, with a fresh disc or chart in place.',
                    ],
                    remark: 'Tachograph: not recording, disc not turning.',
                },
            },
            { key: 'tires', label: 'Tires' },
            {
                key: 'transmission',
                label: 'Transmission',
                note: {
                    where: 'Behind the engine, under the truck. On many automatics the fluid dipstick is at the back of the engine bay.',
                    check: [
                        "On an automatic, the fluid is at the right level. Many are checked warm with the engine running, and some trucks have no dipstick: the owner's manual says how.",
                        'No fluid is leaking from the transmission or its lines.',
                        'It goes into every gear without slipping, grinding or a long delay.',
                    ],
                    remark: 'Transmission: slips going into 2nd, fluid leaking at the pan.',
                    source: 'CDL manual, section 2',
                },
            },
            { key: 'wheels', label: 'Wheels' },
            {
                key: 'windows',
                label: 'Windows',
                note: {
                    where: "The windshield and the cab's side and rear windows.",
                    check: [
                        'On the windshield above the top of the steering wheel, no two cracks cross, and no chip is bigger than a penny (3/4 inch) or closer than 3 inches to another.',
                        'The glass is clean, with no stickers or objects blocking your view.',
                        "The side windows aren't cracked, and they open and close.",
                    ],
                    remark: "Windows: two cracks crossing on driver's side of windshield.",
                    source: 'CDL manual, section 2; 49 CFR 393.60',
                },
            },
            {
                key: 'windshieldWipers',
                label: 'Windshield Wipers',
                note: {
                    where: 'At the bottom of the windshield. The washer fluid tank is under the hood, and its cap usually shows a windshield symbol.',
                    check: [
                        'The wipers work at every speed and clear the glass without streaks.',
                        "The blades aren't torn, cracked or stiff, and the arms press them firmly against the glass.",
                        'The washer sprays onto the windshield, and the tank has fluid.',
                    ],
                    remark: 'Wipers: driver-side blade torn, leaves streaks.',
                    source: 'CDL manual, section 2; 49 CFR 393.78',
                },
            },
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
