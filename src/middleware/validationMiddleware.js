const { body, param, query, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');
const { TASK_STATUSES, TASK_PRIORITIES } = require('../constants');

const handleValidation = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((err) => ({
    field: err.path,
    message: err.msg,
  }));
  throw new AppError('Validation failed', 400, errors);
};

const registerRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .bail()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .bail()
    .isEmail()
    .withMessage('Please provide a valid email')
    .toLowerCase(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .bail()
    .isLength({ min: 8, max: 72 })
    .withMessage('Password must be between 8 and 72 characters'),
  handleValidation,
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .bail()
    .isEmail()
    .withMessage('Please provide a valid email')
    .toLowerCase(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation,
];

const taskFields = [
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('status')
    .optional()
    .isIn(TASK_STATUSES)
    .withMessage(`Status must be one of: ${TASK_STATUSES.join(', ')}`),
  body('priority')
    .optional()
    .isIn(TASK_PRIORITIES)
    .withMessage(`Priority must be one of: ${TASK_PRIORITIES.join(', ')}`),
  body('dueDate')
    .optional({ values: 'null' })
    .isISO8601({ strict: true })
    .withMessage('Due date must be a valid date, e.g. 2026-12-31'),
];

const idRule = param('id').isMongoId().withMessage('Invalid task id');

const createTaskRules = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .bail()
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),
  ...taskFields,
  handleValidation,
];

const updateTaskRules = [
  idRule,
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .bail()
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),
  ...taskFields,
  handleValidation,
];

const taskIdRules = [idRule, handleValidation];

const listTaskRules = [
  query('search').optional().isString().withMessage('Search must be text'),
  query('status')
    .optional()
    .isIn(TASK_STATUSES)
    .withMessage(`Status must be one of: ${TASK_STATUSES.join(', ')}`),
  query('priority')
    .optional()
    .isIn(TASK_PRIORITIES)
    .withMessage(`Priority must be one of: ${TASK_PRIORITIES.join(', ')}`),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidation,
];

module.exports = {
  registerRules,
  loginRules,
  createTaskRules,
  updateTaskRules,
  taskIdRules,
  listTaskRules,
};
