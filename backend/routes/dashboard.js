const router = require('express').Router();
const auth = require('../middleware/auth');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');

// GET /api/dashboard
router.get('/', auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const now = new Date();

    // Projets actifs de l'utilisateur
    const activeProjects = await Project.countDocuments({
      $or: [{ owner: userId }, { members: userId }],
      status: 'actif'
    });

    // Aggrégation des tâches
    const taskStats = await Task.aggregate([
      { $match: { assignedTo: userId } },
      {
        $group: {
          _id: null,
          total:    { $sum: 1 },
          done:     { $sum: { $cond: [{ $eq: ['$status', 'terminé'] }, 1, 0] } },
          late: {
            $sum: {
              $cond: [
                { $and: [
                  { $lt: ['$deadline', now] },
                  { $ne: ['$status', 'terminé'] }
                ]},
                1, 0
              ]
            }
          }
        }
      }
    ]);

    const stats = taskStats[0] || { total: 0, done: 0, late: 0 };

    // Tâches en cours triées par priorité puis deadline
    const priorityOrder = { haute: 1, moyenne: 2, basse: 3 };
    const inProgressTasks = await Task.find({ assignedTo: userId, status: 'en cours' })
      .populate('project', 'title')
      .sort({ deadline: 1 });

    inProgressTasks.sort((a, b) => {
      const pa = priorityOrder[a.priority] || 99;
      const pb = priorityOrder[b.priority] || 99;
      return pa - pb;
    });

    res.json({
      activeProjects,
      assignedTasks: stats.total,
      doneTasks:     stats.done,
      lateTasks:     stats.late,
      inProgressTasks
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
