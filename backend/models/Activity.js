const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type:    { type: String, required: true },  // ex: 'task_created', 'status_changed'
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  details: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
