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
  vehicleLocation: {
    type: String,
  },
  completed: {
    type: Boolean,
    required: true,
  },
  userId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now()
  },
})

module.exports = mongoose.model('Todo', TodoSchema)
