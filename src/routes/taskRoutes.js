const express = require('express');
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');
const {
  createTaskRules,
  updateTaskRules,
  taskIdRules,
  listTaskRules,
} = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

router.route('/').post(createTaskRules, createTask).get(listTaskRules, getTasks);

router
  .route('/:id')
  .get(taskIdRules, getTaskById)
  .put(updateTaskRules, updateTask)
  .delete(taskIdRules, deleteTask);

module.exports = router;
