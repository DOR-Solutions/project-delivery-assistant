const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: String,
  description: String,
  userId: mongoose.Schema.Types.ObjectId
});

module.exports = mongoose.model('Project', projectSchema);
