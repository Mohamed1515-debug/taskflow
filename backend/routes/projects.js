const router = require('express').Router();
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const User = require('../models/User');
const Activity = require('../models/Activity');

// GET /api/projects — liste paginée
router.get('/', auth, async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const filter = {
      $or: [{ owner: req.user.id }, { members: req.user.id }]
    };

    const [projects, total] = await Promise.all([
      Project.find(filter).skip(skip).limit(limit).populate('owner', 'name email').populate('members', 'name email'),
      Project.countDocuments(filter)
    ]);

    res.json({ data: projects, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/projects/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members', 'name email');
    if (!project) return res.status(404).json({ message: 'Projet introuvable' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/projects
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, deadline } = req.body;
    const project = await Project.create({ title, description, deadline, owner: req.user.id });
    await Activity.create({ type: 'project_created', project: project._id, user: req.user.id, details: `Projet "${title}" créé` });
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/projects/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable' });
    if (project.owner.toString() !== req.user.id)
      return res.status(403).json({ message: 'Accès refusé' });

    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    await Activity.create({ type: 'project_updated', project: project._id, user: req.user.id, details: `Projet modifié` });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable' });
    if (project.owner.toString() !== req.user.id)
      return res.status(403).json({ message: 'Accès refusé' });

    await project.deleteOne(); // déclenche le pre('deleteOne') en cascade
    res.json({ message: 'Projet supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/projects/:id/invite — inviter un membre par email
router.post('/:id/invite', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable' });
    if (project.owner.toString() !== req.user.id)
      return res.status(403).json({ message: 'Accès refusé' });

    const invitee = await User.findOne({ email: req.body.email });
    if (!invitee) return res.status(404).json({ message: 'Utilisateur introuvable' });
    if (project.members.includes(invitee._id))
      return res.status(409).json({ message: 'Déjà membre' });

    project.members.push(invitee._id);
    await project.save();
    await Activity.create({ type: 'member_added', project: project._id, user: req.user.id, details: `${invitee.name} ajouté au projet` });
    res.json({ message: 'Membre ajouté' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/projects/:id/members/:userId — retirer un membre
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable' });
    if (project.owner.toString() !== req.user.id)
      return res.status(403).json({ message: 'Accès refusé' });

    project.members = project.members.filter(m => m.toString() !== req.params.userId);
    await project.save();
    await Activity.create({ type: 'member_removed', project: project._id, user: req.user.id, details: `Membre retiré` });
    res.json({ message: 'Membre retiré' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/projects/:id/activities
router.get('/:id/activities', auth, async (req, res) => {
  try {
    const activities = await Activity.find({ project: req.params.id })
      .populate('user', 'name')
      .sort({ createdAt: -1 });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
