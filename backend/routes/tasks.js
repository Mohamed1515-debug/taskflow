const router = require('express').Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');

// GET /api/projects/:id/tasks — tâches d'un projet avec filtres
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const { status, priority, assignedTo, search, page = 1, limit = 20 } = req.query;
    const filter = { project: req.params.projectId };

    if (status)     filter.status = status;
    if (priority)   filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (search)     filter.$or = [
      { title:       { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Task.find(filter)
        .populate('assignedTo', 'name email')
        .sort({ priority: -1, deadline: 1 })
        .skip(skip).limit(parseInt(limit)),
      Task.countDocuments(filter)
    ]);

    res.json({ data, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/tasks
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, priority, deadline, project, assignedTo } = req.body;
    const task = await Task.create({ title, description, priority, deadline, project, assignedTo });

    await Activity.create({ type: 'task_created', project, user: req.user.id, details: `Tâche "${title}" créée` });

    if (assignedTo && assignedTo !== req.user.id) {
      await Notification.create({ user: assignedTo, message: `Une tâche vous a été assignée : "${title}"`, project });
    }

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!task) return res.status(404).json({ message: 'Tâche introuvable' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/tasks/:id/status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['à faire', 'en cours', 'terminé'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ message: 'Statut invalide' });

    const task = await Task.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!task) return res.status(404).json({ message: 'Tâche introuvable' });

    await Activity.create({ type: 'status_changed', project: task.project, user: req.user.id, details: `Statut de "${task.title}" → ${status}` });

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Tâche introuvable' });
    await Activity.create({ type: 'task_deleted', project: task.project, user: req.user.id, details: `Tâche "${task.title}" supprimée` });
    res.json({ message: 'Tâche supprimée' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
