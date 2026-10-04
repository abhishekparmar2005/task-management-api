const Task = require('../models/Task');
const AppError = require('../utils/AppError');

const UPDATABLE_FIELDS = ['title', 'description', 'status', 'priority', 'dueDate'];

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const createTask = async (req, res) => {
  const { title, description, status, priority, dueDate } = req.body;

  const task = await Task.create({
    user: req.user._id,
    title,
    description,
    status,
    priority,
    dueDate,
  });

  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: { task },
  });
};

const getTasks = async (req, res) => {
  const { search, status, priority } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  const filter = { user: req.user._id };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (search && search.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ title: regex }, { description: regex }];
  }

  const [tasks, totalTasks] = await Promise.all([
    Task.find(filter)
      .sort({ createdDate: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Task.countDocuments(filter),
  ]);

  res.json({
    success: true,
    message: 'Tasks fetched successfully',
    data: {
      tasks,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalTasks / limit),
        totalTasks,
        limit,
      },
    },
  });
};

const getTaskById = async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  res.json({
    success: true,
    message: 'Task fetched successfully',
    data: { task },
  });
};

const updateTask = async (req, res) => {
  const updates = {};
  UPDATABLE_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  if (Object.keys(updates).length === 0) {
    throw new AppError('Provide at least one field to update', 400);
  }

  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    updates,
    { new: true, runValidators: true }
  );
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  res.json({
    success: true,
    message: 'Task updated successfully',
    data: { task },
  });
};

const deleteTask = async (req, res) => {
  const task = await Task.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  res.json({
    success: true,
    message: 'Task deleted successfully',
  });
};

module.exports = { createTask, getTasks, getTaskById, updateTask, deleteTask };
