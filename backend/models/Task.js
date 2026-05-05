const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: String,
  completed: Boolean,
  projectId: mongoose.Schema.Types.ObjectId
});

module.exports = mongoose.model('Task', taskSchema);
