const mongoose = require('mongoose');
const { TASK_STATUSES, TASK_PRIORITIES } = require('../constants');

const taskSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    default: '',
  },
  status: {
    type: String,
    enum: { values: TASK_STATUSES, message: 'Invalid status' },
    default: 'Pending',
  },
  priority: {
    type: String,
    enum: { values: TASK_PRIORITIES, message: 'Invalid priority' },
    default: 'Medium',
  },
  dueDate: { type: Date, default: null },
  createdDate: { type: Date, default: Date.now },
});

taskSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Task', taskSchema);
