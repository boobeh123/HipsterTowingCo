const mongoose = require('mongoose')

const TruckTractorDefectsSchema = new mongoose.Schema({
    airCompressor:    { type: Boolean, default: false },
    airLines:         { type: Boolean, default: false },
    battery:          { type: Boolean, default: false },
    brakeAccessories: { type: Boolean, default: false },
    brakes:           { type: Boolean, default: false },
    carburetor:       { type: Boolean, default: false },
    clutch:           { type: Boolean, default: false },
    defroster:        { type: Boolean, default: false },
    driveLine:        { type: Boolean, default: false },
    engine:           { type: Boolean, default: false },
    fifthWheel:       { type: Boolean, default: false },
    frontAxle:        { type: Boolean, default: false },
    fuelTanks:        { type: Boolean, default: false },
    heater:           { type: Boolean, default: false },
    horn:             { type: Boolean, default: false },
    lights:           { type: Boolean, default: false },
    mirrors:          { type: Boolean, default: false },
    muffler:          { type: Boolean, default: false },
    oilPressure:      { type: Boolean, default: false },
    onBoardRecorder:  { type: Boolean, default: false },
    radiator:         { type: Boolean, default: false },
    rearEnd:          { type: Boolean, default: false },
    reflectors:       { type: Boolean, default: false },
    safetyEquipment:  { type: Boolean, default: false },
    springs:          { type: Boolean, default: false },
    starter:          { type: Boolean, default: false },
    steering:         { type: Boolean, default: false },
    tachograph:       { type: Boolean, default: false },
    tires:            { type: Boolean, default: false },
    transmission:     { type: Boolean, default: false },
    wheels:           { type: Boolean, default: false },
    windows:          { type: Boolean, default: false },
    windshieldWipers: { type: Boolean, default: false },
    other:            { type: Boolean, default: false }
}, { _id: false })

const TrailerDefectsSchema = new mongoose.Schema({
    brakeConnections: { type: Boolean, default: false },
    brakes:           { type: Boolean, default: false },
    couplingChains:   { type: Boolean, default: false },
    couplingPin:      { type: Boolean, default: false },
    doors:            { type: Boolean, default: false },
    hitch:            { type: Boolean, default: false },
    landingGear:      { type: Boolean, default: false },
    lightsAll:        { type: Boolean, default: false },
    roof:             { type: Boolean, default: false },
    springs:          { type: Boolean, default: false },
    tarpaulin:        { type: Boolean, default: false },
    tires:            { type: Boolean, default: false },
    wheels:           { type: Boolean, default: false },
    other:            { type: Boolean, default: false }
}, { _id: false })

const InspectionSchema = new mongoose.Schema({
    // Core identification
    truckTractorNo: {
        type: String,
        required: [true, 'USDOT/Truck number is required.'],
        trim: true,
        minLength: [1, 'Truck number must be at least 1 character long.']
    },
    trailerNo: {
        type: String,
        trim: true,
    },
    date: {
        type: String,
        trim: true,
    },

    // Defect checklists
    defects: {
        type: {
            truckTractor: { type: TruckTractorDefectsSchema, default: () => ({}) },
            trailer:      { type: TrailerDefectsSchema,      default: () => ({}) }
        },
        default: () => ({})
    },

    // Remarks
    remarks: {
        type: String,
        trim: true,
    },

    // Condition & certification
    conditionSatisfactory: {
        type: Boolean,
        default: false,
    },

    // Driver section
    // driverSignature kept for backwards compatibility — old records may have this field
    driverSignature: {
        type: String,
        trim: true,
    },
    driverDate: {
        type: String,
        trim: true,
    },

    // Mechanic section
    defectsCorrected: {
        type: Boolean,
        default: false,
    },
    defectsNotCorrected: {
        type: Boolean,
        default: false,
    },
    // mechanicSignature kept for backwards compatibility — old records may have this field
    mechanicSignature: {
        type: String,
        trim: true,
    },
    mechanicDate: {
        type: String,
        trim: true,
    },

    // Ownership
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // createdAt and updatedAt are supplied by { timestamps: true } below.
    // They were also declared manually here, which was redundant and made it
    // unclear which one governed.
}, { timestamps: true })

/**************************************************************
 * Every dashboard query filters by userId and sorts by createdAt,
 * so this compound index covers all of them. Without it each one is
 * a collection scan. The order matters: equality field first, then
 * the sort field, descending to match the queries.
 **************************************************************/
InspectionSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.model('Inspection', InspectionSchema)
