const mongoose = require('mongoose')

// Sub-schema for Truck/Tractor defects to be nested in the main InspectionSchema
const TruckTractorDefectsSchema = new mongoose.Schema({
    airCompressor: { type: Boolean, default: false },
    airLines: { type: Boolean, default: false },
    battery: { type: Boolean, default: false },
    brakeAccessories: { type: Boolean, default: false },
    brakes: { type: Boolean, default: false },
    carburetor: { type: Boolean, default: false },
    clutch: { type: Boolean, default: false },
    defroster: { type: Boolean, default: false },
    driveLine: { type: Boolean, default: false },
    engine: { type: Boolean, default: false },
    fifthWheel: { type: Boolean, default: false },
    frontAxle: { type: Boolean, default: false },
    fuelTanks: { type: Boolean, default: false },
    heater: { type: Boolean, default: false },
    horn: { type: Boolean, default: false },
    lights: { type: Boolean, default: false },
    mirrors: { type: Boolean, default: false },
    muffler: { type: Boolean, default: false },
    oilPressure: { type: Boolean, default: false },
    onBoardRecorder: { type: Boolean, default: false },
    radiator: { type: Boolean, default: false },
    rearEnd: { type: Boolean, default: false },
    reflectors: { type: Boolean, default: false },
    safetyEquipment: { type: Boolean, default: false },
    springs: { type: Boolean, default: false },
    starter: { type: Boolean, default: false },
    steering: { type: Boolean, default: false },
    tachograph: { type: Boolean, default: false },
    tires: { type: Boolean, default: false },
    transmission: { type: Boolean, default: false },
    wheels: { type: Boolean, default: false },
    windows: { type: Boolean, default: false },
    windshieldWipers: { type: Boolean, default: false },
    other: { type: String, default: '' }
}, { _id: false }); // No _id needed for sub-documents

// Sub-schema for Trailer defects
const TrailerDefectsSchema = new mongoose.Schema({
    brakeConnections: { type: Boolean, default: false },
    brakes: { type: Boolean, default: false },
    couplingChains: { type: Boolean, default: false },
    couplingPin: { type: Boolean, default: false },
    doors: { type: Boolean, default: false },
    hitch: { type: Boolean, default: false },
    landingGear: { type: Boolean, default: false },
    lightsAll: { type: Boolean, default: false },
    roof: { type: Boolean, default: false },
    springs: { type: Boolean, default: false },
    tarpaulin: { type: Boolean, default: false },
    tires: { type: Boolean, default: false },
    wheels: { type: Boolean, default: false },
    other: { type: String, default: '' }
}, { _id: false });

const InspectionSchema = new mongoose.Schema({
  // Basic Info
  truckTractorNo: {
    type: String,
    required: [true, 'USDOT/Truck number is required.'],
    trim: true,
    minLength: [3, 'Truck number must be at least 3 characters long.']
  },
  trailerNo: {
    type: String,
    trim: true,
  },
  
  // Defect Checklists (nested objects)
  defects: {
    truckTractor: TruckTractorDefectsSchema,
    trailer: TrailerDefectsSchema
  },

  remarks: {
    type: String,
    trim: true,
  },

  // Signatures & Status
  conditionSatisfactory: {
    type: Boolean,
    default: false,
  },
  driverSignature: { // Representing signature with a name or ID for now
    type: String,
    // required: true,
  },
  defectsCorrected: {
    type: Boolean,
    default: false,
  },
  defectsNotCorrected: {
    type: Boolean,
    default: false,
  },
  mechanicSignature: {
    type: String,
    trim: true,
  },
  mechanicDate: {
    type: String, // Using string to match form data, can be Date if needed
    trim: true,
  },
  
  // User and Timestamp
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
})

module.exports = mongoose.model('Inspection', InspectionSchema)
