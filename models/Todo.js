const mongoose = require('mongoose')

const TodoSchema = new mongoose.Schema({
  todo: {
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
  todoInfo: {
    type: String,
  },
  todoDate: {
    type: Date,
  },
  todoLevel: {
    type: Number,
  }
})

module.exports = mongoose.model('Todo', TodoSchema)
