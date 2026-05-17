const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  deadline:    { type: Date },
  status:      { type: String, enum: ['actif', 'en pause', 'archivé'], default: 'actif' },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

// Suppression en cascade des tâches liées
projectSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  await mongoose.model('Task').deleteMany({ project: this._id });
  await mongoose.model('Activity').deleteMany({ project: this._id });
  next();
});

module.exports = mongoose.model('Project', projectSchema);
