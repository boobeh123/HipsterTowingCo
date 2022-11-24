const mongoose = require('mongoose')

const TodoSchema = new mongoose.Schema({
  contactNumber: {
    type: Number,
    required: true,
  },
  vehicleAddressPick: {
    type: String,
    required: true,
  },
  vehicleAddressDrop: {
    type: String,
  },
  contactRideAlong: {
    type: Boolean,
    required: true,
  },
  vehicleType: {
    type: String,
    required: true,
  },
  vehicleDoor: {
    type: Number,
    required: true,
  },
  vehicleColor: {
    type: String,
    required: true,
  },
  vehicleYear: {
    type: Number,
  },
  vehicleMake: {
    type: String,
  },
  vehicleModel: {
    type: String,
  },
  customerNotes: {
    type: String,
  },
  completed: {
    type: Boolean,
    required: true,
  },
  assigned: {
    type: Boolean,
    required: true,
  },
  assignedTo: {
    type: String,
  },
  driverName: {
    type: String,
  },
  accepted: {
    type: Boolean,
    required: true,
  },
  driverStatus: {
    type: String,
  },
  userId: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now()
  },
})

module.exports = mongoose.model('Todo', TodoSchema)
