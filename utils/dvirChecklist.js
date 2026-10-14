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
 *   photos   one to three { src, width, height, alt, caption } from
 *            public/imgs/notes/ (two portrait photos sit side by
 *            side). Photos are of a real truck: crop or blur out
 *            plates and company details, and strip their metadata.
 * The notes are written from the CDL manual (sections 2 and 11, in
 * our own words) and 49 CFR, and someone with a CDL reviews them
 * before they ship. Every truck box has one except the air-brake
 * ones and Fifth Wheel, which wait, with the trailer items, for a
 * reviewer with a Class A license.
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
                    photos: [
                        {
                            src: '/imgs/notes/battery.webp',
                            width: 600,
                            height: 706,
                            alt: 'A battery under the hood, held in its tray',
                            caption: 'The battery, under the hood on this truck.',
                        },
                        {
                            src: '/imgs/notes/battery-terminals.webp',
                            width: 600,
                            height: 709,
                            alt: 'Battery cable ends, the positive one under a red cover',
                            caption: 'Check the cable ends: tight, with no heavy white or green crust.',
                        },
                    ],
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
                    photos: [
                        {
                            src: '/imgs/notes/brake-fluid-cap.webp',
                            width: 960,
                            height: 720,
                            alt: 'Brake fluid reservoir cap marked DOT 3 with a yellow brake symbol',
                            caption: 'The brake fluid reservoir: its cap says DOT 3 and shows the brake symbol.',
                        },
                    ],
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
            {
                key: 'driveLine',
                label: 'Drive Line',
                note: {
                    where: 'Under the truck: the drive shaft running from the transmission back to the rear axle.',
                    check: [
                        "The drive shaft isn't bent, cracked or dented.",
                        'The U-joints and couplings are secure, with nothing wrapped around them, such as wire or plastic.',
                        'There is no clunk or shudder from under the truck when you pull away or shift.',
                    ],
                    remark: 'Drive line: rear U-joint has play, clunks when pulling away.',
                    source: 'CDL manual, section 11 (vehicle inspection test)',
                },
            },
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
                    photos: [
                        {
                            src: '/imgs/notes/engine-oil.webp',
                            width: 800,
                            height: 800,
                            alt: 'Engine oil fill cap marked SAE 5W-30, with the yellow oil dipstick handle below it',
                            caption: 'The oil fill cap and the yellow engine oil dipstick.',
                        },
                    ],
                },
            },
            { key: 'fifthWheel', label: 'Fifth Wheel' },
            {
                key: 'frontAxle',
                label: 'Front Axle',
                note: {
                    where: 'Under the front of the truck, between the front wheels.',
                    check: [
                        "The axle isn't cracked or bent.",
                        "The parts that hold it in place, such as U-bolts and spring hangers, aren't loose, cracked or missing.",
                    ],
                    remark: 'Front axle: U-bolt nut missing on left side.',
                    source: 'CDL manual, section 2; 49 CFR 393.207',
                },
            },
            {
                key: 'fuelTanks',
                label: 'Fuel Tanks',
                note: {
                    where: 'Under the truck or on the frame rails, usually behind the cab.',
                    check: [
                        'Each tank is mounted securely, with its straps tight.',
                        "It isn't dented, damaged or leaking, and there's no fuel smell.",
                        'The cap is on and tight.',
                        "The fuel lines aren't leaking or rubbing on anything.",
                    ],
                    more: "Also make sure there's enough fuel for the trip.",
                    remark: 'Fuel tank: mounting strap loose, fuel smell at the cap.',
                    source: 'CDL manual, section 2; 49 CFR 393.65',
                    photos: [
                        {
                            src: '/imgs/notes/fuel-cap.webp',
                            width: 960,
                            height: 720,
                            alt: 'A hand tightening the fuel cap under an Unleaded Fuel Only sticker',
                            caption: 'The fuel cap: on and tight.',
                        },
                    ],
                },
            },
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
            {
                key: 'lights',
                label: 'Lights',
                note: {
                    where: 'All around the truck: headlights and turn signals at the front, marker lights along the sides, and tail, brake and turn signals at the back.',
                    check: [
                        'Every light works: low and high beams, turn signals and four-way flashers front and back, tail lights, brake lights, marker lights and the license plate light.',
                        'On a truck 80 inches wide or more, as most box trucks are, the clearance lights at the corners and the identification lights work too.',
                        'The lenses are clean, not cracked or missing, and the right color: white headlights, amber at the front and sides, red at the back (rear turn signals can be red or amber).',
                    ],
                    more: 'To check the brake lights on your own, press the pedal and watch their reflection on a wall or vehicle behind you, or ask someone to watch.',
                    remark: 'Lights: left rear brake light out.',
                    source: 'CDL manual, section 2; 49 CFR 393.11',
                    photos: [
                        {
                            src: '/imgs/notes/lights-front.webp',
                            width: 960,
                            height: 322,
                            alt: 'Front of the truck with the headlights and the amber front lights on',
                            caption: 'Front: white headlights, with amber turn signals and parking lights.',
                        },
                        {
                            src: '/imgs/notes/lights-rear.webp',
                            width: 960,
                            height: 720,
                            alt: 'Back of the box truck with its red lights on; the company details on the door are covered',
                            caption: 'Back: red clearance lights at the top corners, three identification lights in the middle, and the tail lights. Company details covered.',
                        },
                        {
                            src: '/imgs/notes/dash-gauges.webp',
                            width: 960,
                            height: 463,
                            alt: 'The instrument cluster with the blue high-beam light on at the left',
                            caption: 'In the cab: the blue light at the left of the gauges shows the high beams are on.',
                        },
                    ],
                },
            },
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
                    photos: [
                        {
                            src: '/imgs/notes/mirrors-before.webp',
                            width: 600,
                            height: 678,
                            alt: 'A side mirror with dust and water spots on the glass',
                            caption: 'Before: dust and water spots on the glass.',
                        },
                        {
                            src: '/imgs/notes/mirrors-after.webp',
                            width: 600,
                            height: 679,
                            alt: 'The same mirror after cleaning',
                            caption: 'After: wiped with a microfiber cloth and ammonia-free glass cleaner.',
                        },
                    ],
                },
            },
            {
                key: 'muffler',
                label: 'Muffler',
                note: {
                    where: 'Under the truck: the exhaust pipes, muffler and tailpipe, or a stack behind the cab.',
                    check: [
                        'The pipes, muffler and tailpipe are mounted securely, and none is cracked, broken or missing.',
                        'Nothing leaks: no black soot around the joints, no unusually loud exhaust and no exhaust smell in the cab.',
                        'No part of the exhaust touches fuel lines, wiring, tires or other moving parts.',
                        "There are no wrap or patch repairs. They aren't allowed, even as a temporary fix.",
                    ],
                    remark: 'Muffler: exhaust leaking at the muffler inlet, black soot, loud.',
                    source: 'CDL manual, section 2; 49 CFR 393.83',
                    photos: [
                        {
                            src: '/imgs/notes/tailpipe.webp',
                            width: 960,
                            height: 720,
                            alt: 'The end of the tailpipe under the truck',
                            caption: 'The tailpipe: secure, not cracked and not hanging loose.',
                        },
                    ],
                },
            },
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
                    photos: [
                        {
                            src: '/imgs/notes/dash-gauges.webp',
                            width: 960,
                            height: 463,
                            alt: 'The instrument cluster before the engine starts: warning lights on, oil pressure at 0',
                            caption: 'The gauges: oil pressure (top left), voltage (top right), temperature (bottom left) and fuel. Before the engine starts, the warning lights are on and the oil pressure reads 0.',
                        },
                    ],
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
                    photos: [
                        {
                            src: '/imgs/notes/coolant-tank.webp',
                            width: 600,
                            height: 681,
                            alt: 'A white coolant tank with a black cap and a COLD FILL mark on its side',
                            caption: 'The coolant tank, with a COLD FILL mark on its side.',
                        },
                        {
                            src: '/imgs/notes/coolant-cap.webp',
                            width: 600,
                            height: 699,
                            alt: 'A coolant pressure cap labeled NEVER OPEN HOT',
                            caption: 'A coolant pressure cap says it too: never open hot.',
                        },
                    ],
                },
            },
            {
                key: 'rearEnd',
                label: 'Rear End',
                note: {
                    where: 'The rear axle under the back of the truck, with the differential: the round housing in the middle.',
                    check: [
                        'No gear oil is leaking from the differential or the axle seals. Look for oil on the inside of the rear wheels too.',
                        "The axle is secure, and the parts that hold it in place aren't loose, cracked or missing.",
                        'There is no clunking, whining or grinding from the rear when you drive or turn.',
                    ],
                    remark: 'Rear end: gear oil leaking at the differential.',
                    source: 'CDL manual, section 2',
                },
            },
            {
                key: 'reflectors',
                label: 'Reflectors',
                note: {
                    where: 'At the back of the truck, along its sides and at the front corners.',
                    check: [
                        'Every reflector is there, clean, and not cracked or broken.',
                        'The colors are right: red at the back and at the rear of each side, amber elsewhere on the sides and at the front.',
                    ],
                    remark: 'Reflectors: right rear reflector missing.',
                    source: 'CDL manual, section 2; 49 CFR 393.11',
                },
            },
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
            {
                key: 'springs',
                label: 'Springs',
                note: {
                    where: 'Above each axle, under the frame: leaf springs on most trucks, with shock absorbers beside them. Some trucks have air bags instead.',
                    check: [
                        'No spring leaf is cracked, broken, missing or shifted out of place, where it could hit a tire.',
                        "The spring hangers and U-bolts aren't cracked, loose or missing.",
                        "The shock absorbers aren't leaking or broken.",
                        'The truck sits level, not leaning to one side.',
                        "If it has air suspension, it isn't damaged or leaking.",
                    ],
                    remark: 'Springs: broken leaf in left rear spring.',
                    source: 'CDL manual, section 2; 49 CFR 393.207',
                },
            },
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
                    photos: [
                        {
                            src: '/imgs/notes/power-steering-cap.webp',
                            width: 960,
                            height: 720,
                            alt: 'Power steering reservoir cap with a steering wheel symbol',
                            caption: 'The power steering reservoir: its cap shows a steering wheel.',
                        },
                    ],
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
            {
                key: 'tires',
                label: 'Tires',
                note: {
                    where: 'Every tire, including the inside tire of each pair of duals.',
                    check: [
                        "The pressure matches the sticker in the driver's door jamb. Check it with a gauge while the tires are cold: kicking a tire only finds a flat.",
                        'The tread is at least 4/32 inch deep in every major groove on the front tires, and 2/32 inch on the others.',
                        'There are no cuts or bulges, no fabric or cords showing in the tread or sidewall, and no tread coming apart.',
                        "The valve stems aren't cut or cracked.",
                        "Duals don't touch each other, and nothing is stuck between them.",
                        "Tires on the same axle match in size, and radial and bias-ply tires aren't mixed.",
                    ],
                    more: "A quick tread check: put a quarter upside down in a groove. If you can see the top of Washington's head, the tread is under 4/32 inch. A penny does the same for 2/32 inch with Lincoln's head. A tread depth gauge is more exact.",
                    remark: 'Tires: left front sidewall bulge.',
                    source: 'CDL manual, section 2; 49 CFR 393.75',
                    photos: [
                        {
                            src: '/imgs/notes/tire-penny.webp',
                            width: 960,
                            height: 720,
                            alt: 'A penny pushed head first into a tire groove',
                            caption: "The penny check: Lincoln's head goes in first. Part of his head is hidden here, so this tread is deeper than 2/32 inch.",
                        },
                    ],
                },
            },
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
            {
                key: 'wheels',
                label: 'Wheels',
                note: {
                    where: 'Every wheel, including the inner wheel of each pair of duals, and the hub at its center.',
                    check: [
                        "No lug nut or stud is missing, broken or loose. Rust streaks running from a nut can mean it's loose.",
                        "The wheel and rim aren't cracked or bent, the stud holes aren't worn oval, and there are no welding repairs.",
                        "The hub and wheel seals aren't leaking, and the hub oil is at the right level if the hub has a sight window.",
                    ],
                    more: 'After a tire change, stop a short while later and check that the lug nuts are still tight.',
                    remark: 'Wheels: two lug nuts missing, right rear outer wheel.',
                    source: 'CDL manual, section 2; 49 CFR 393.205',
                    photos: [
                        {
                            src: '/imgs/notes/wheel-front.webp',
                            width: 960,
                            height: 720,
                            alt: 'A front wheel with its lug nuts and hub',
                            caption: 'Check every lug nut, and the wheel around them.',
                        },
                    ],
                },
            },
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
                    photos: [
                        {
                            src: '/imgs/notes/washer-cap.webp',
                            width: 960,
                            height: 720,
                            alt: 'Washer fluid tank cap with a windshield and spray symbol',
                            caption: "The washer fluid tank's cap shows a windshield being sprayed.",
                        },
                    ],
                },
            },
            {
                key: 'other',
                label: 'Other',
                note: {
                    where: 'Anything on the truck that has no box of its own.',
                    check: [
                        'The cab doors open, close and latch, and the steps and handholds are secure.',
                        "The frame and cross members aren't bent or cracked.",
                        'The mud flaps are there, fastened, and not dragging or rubbing a tire.',
                        'The license plate is there, clean and secure.',
                        'On a box truck, the cargo door latches, and the load is blocked, braced or tied down.',
                    ],
                    more: 'Tick Other and name the part in Remarks.',
                    remark: "Other: cargo door latch broken, door won't stay shut.",
                    source: 'CDL manual, section 2',
                },
            },
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
