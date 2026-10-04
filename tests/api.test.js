require('dotenv').config({ quiet: true });

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

const app = require('../src/app');
const User = require('../src/models/User');
const Task = require('../src/models/Task');

const runId = Date.now();
const userA = { name: 'User A', email: `a_${runId}@example.com`, password: 'password123' };
const userB = { name: 'User B', email: `b_${runId}@example.com`, password: 'password123' };

let server;
let baseUrl;
let tokenA;
let tokenB;
let taskId;

const request = async (method, path, { token, body, rawBody } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(baseUrl + path, {
    method,
    headers,
    body: rawBody || (body ? JSON.stringify(body) : undefined),
  });
  return { status: res.status, body: await res.json() };
};

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  const users = await User.find({ email: { $in: [userA.email, userB.email] } });
  await Task.deleteMany({ user: { $in: users.map((u) => u._id) } });
  await User.deleteMany({ _id: { $in: users.map((u) => u._id) } });
  await mongoose.disconnect();
  server.close();
});

test('register rejects invalid input', async () => {
  const res = await request('POST', '/api/auth/register', {
    body: { name: '', email: 'not-an-email', password: '123' },
  });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.errors.length, 3);
});

test('register creates a user without exposing the password', async () => {
  const res = await request('POST', '/api/auth/register', { body: userA });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.data.user.email, userA.email);
  assert.strictEqual(res.body.data.user.password, undefined);

  const saved = await User.findOne({ email: userA.email }).select('+password');
  assert.notStrictEqual(saved.password, userA.password);
});

test('register rejects duplicate email', async () => {
  const res = await request('POST', '/api/auth/register', { body: userA });
  assert.strictEqual(res.status, 409);
});

test('login fails with wrong password or unknown email', async () => {
  const wrongPassword = await request('POST', '/api/auth/login', {
    body: { email: userA.email, password: 'wrong-password' },
  });
  assert.strictEqual(wrongPassword.status, 401);

  const unknownEmail = await request('POST', '/api/auth/login', {
    body: { email: `nobody_${runId}@example.com`, password: 'password123' },
  });
  assert.strictEqual(unknownEmail.status, 401);
});

test('login returns a token and safe user data', async () => {
  await request('POST', '/api/auth/register', { body: userB });

  const resA = await request('POST', '/api/auth/login', {
    body: { email: userA.email, password: userA.password },
  });
  assert.strictEqual(resA.status, 200);
  assert.ok(resA.body.data.token);
  assert.strictEqual(resA.body.data.user.password, undefined);
  tokenA = resA.body.data.token;

  const resB = await request('POST', '/api/auth/login', {
    body: { email: userB.email, password: userB.password },
  });
  tokenB = resB.body.data.token;
});

test('profile requires a valid token', async () => {
  const noToken = await request('GET', '/api/auth/profile');
  assert.strictEqual(noToken.status, 401);

  const badToken = await request('GET', '/api/auth/profile', { token: 'abc.def.ghi' });
  assert.strictEqual(badToken.status, 401);

  const ok = await request('GET', '/api/auth/profile', { token: tokenA });
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.body.data.user.email, userA.email);
  assert.strictEqual(ok.body.data.user.password, undefined);
});

test('task routes are protected', async () => {
  const res = await request('GET', '/api/tasks');
  assert.strictEqual(res.status, 401);
});

test('create task validates input', async () => {
  const noTitle = await request('POST', '/api/tasks', { token: tokenA, body: {} });
  assert.strictEqual(noTitle.status, 400);

  const badValues = await request('POST', '/api/tasks', {
    token: tokenA,
    body: { title: 'x', status: 'Done', priority: 'Urgent', dueDate: 'tomorrow' },
  });
  assert.strictEqual(badValues.status, 400);
  assert.strictEqual(badValues.body.errors.length, 3);
});

test('create task applies defaults and server-side createdDate', async () => {
  const res = await request('POST', '/api/tasks', {
    token: tokenA,
    body: { title: 'Plan project kickoff' },
  });
  assert.strictEqual(res.status, 201);
  const { task } = res.body.data;
  assert.strictEqual(task.status, 'Pending');
  assert.strictEqual(task.priority, 'Medium');
  assert.ok(task.createdDate);
  taskId = task._id;
});

test('create task with all fields', async () => {
  const tasks = [
    { title: 'Write report', description: 'Quarterly project report', status: 'Completed', priority: 'High', dueDate: '2026-12-31' },
    { title: 'Buy groceries', description: 'Milk and eggs', status: 'In Progress', priority: 'Low' },
    { title: 'Fix bug', description: 'Login page project issue', status: 'Completed', priority: 'Low' },
  ];
  for (const body of tasks) {
    const res = await request('POST', '/api/tasks', { token: tokenA, body });
    assert.strictEqual(res.status, 201);
  }
});

test('list tasks returns pagination metadata', async () => {
  const res = await request('GET', '/api/tasks', { token: tokenA });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.tasks.length, 4);
  assert.deepStrictEqual(res.body.data.pagination, {
    currentPage: 1,
    totalPages: 1,
    totalTasks: 4,
    limit: 10,
  });
});

test('search matches title and description', async () => {
  const res = await request('GET', '/api/tasks?search=project', { token: tokenA });
  assert.strictEqual(res.body.data.pagination.totalTasks, 3);

  const regexChars = await request('GET', '/api/tasks?search=(', { token: tokenA });
  assert.strictEqual(regexChars.status, 200);
  assert.strictEqual(regexChars.body.data.pagination.totalTasks, 0);
});

test('filter by status and priority', async () => {
  const status = await request('GET', '/api/tasks?status=Completed', { token: tokenA });
  assert.strictEqual(status.body.data.pagination.totalTasks, 2);

  const priority = await request('GET', '/api/tasks?priority=Low', { token: tokenA });
  assert.strictEqual(priority.body.data.pagination.totalTasks, 2);

  const combined = await request(
    'GET',
    '/api/tasks?search=project&status=Completed&priority=High',
    { token: tokenA }
  );
  assert.strictEqual(combined.body.data.pagination.totalTasks, 1);
  assert.strictEqual(combined.body.data.tasks[0].title, 'Write report');
});

test('pagination splits results across pages', async () => {
  const page1 = await request('GET', '/api/tasks?page=1&limit=3', { token: tokenA });
  assert.strictEqual(page1.body.data.tasks.length, 3);
  assert.strictEqual(page1.body.data.pagination.totalPages, 2);

  const page2 = await request('GET', '/api/tasks?page=2&limit=3', { token: tokenA });
  assert.strictEqual(page2.body.data.tasks.length, 1);

  const ids = [...page1.body.data.tasks, ...page2.body.data.tasks].map((t) => t._id);
  assert.strictEqual(new Set(ids).size, 4);
});

test('invalid query params are rejected', async () => {
  for (const q of ['status=Done', 'priority=Urgent', 'page=0', 'limit=1000', 'limit=abc']) {
    const res = await request('GET', `/api/tasks?${q}`, { token: tokenA });
    assert.strictEqual(res.status, 400, q);
  }
});

test('get single task, invalid id and missing id', async () => {
  const ok = await request('GET', `/api/tasks/${taskId}`, { token: tokenA });
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.body.data.task.title, 'Plan project kickoff');

  const invalid = await request('GET', '/api/tasks/not-an-id', { token: tokenA });
  assert.strictEqual(invalid.status, 400);

  const missing = await request('GET', `/api/tasks/${new mongoose.Types.ObjectId()}`, { token: tokenA });
  assert.strictEqual(missing.status, 404);
});

test('update task', async () => {
  const res = await request('PUT', `/api/tasks/${taskId}`, {
    token: tokenA,
    body: { status: 'In Progress', priority: 'High', dueDate: '2026-11-15' },
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.task.status, 'In Progress');
  assert.strictEqual(res.body.data.task.priority, 'High');
  assert.strictEqual(res.body.data.task.title, 'Plan project kickoff');

  const empty = await request('PUT', `/api/tasks/${taskId}`, { token: tokenA, body: {} });
  assert.strictEqual(empty.status, 400);

  const invalid = await request('PUT', `/api/tasks/${taskId}`, {
    token: tokenA,
    body: { status: 'Done' },
  });
  assert.strictEqual(invalid.status, 400);
});

test("another user cannot read, update or delete someone else's task", async () => {
  const get = await request('GET', `/api/tasks/${taskId}`, { token: tokenB });
  assert.strictEqual(get.status, 404);

  const put = await request('PUT', `/api/tasks/${taskId}`, {
    token: tokenB,
    body: { title: 'Hacked' },
  });
  assert.strictEqual(put.status, 404);

  const del = await request('DELETE', `/api/tasks/${taskId}`, { token: tokenB });
  assert.strictEqual(del.status, 404);

  const list = await request('GET', '/api/tasks', { token: tokenB });
  assert.strictEqual(list.body.data.pagination.totalTasks, 0);

  const stillThere = await request('GET', `/api/tasks/${taskId}`, { token: tokenA });
  assert.strictEqual(stillThere.status, 200);
  assert.strictEqual(stillThere.body.data.task.title, 'Plan project kickoff');
});

test('delete task', async () => {
  const del = await request('DELETE', `/api/tasks/${taskId}`, { token: tokenA });
  assert.strictEqual(del.status, 200);

  const get = await request('GET', `/api/tasks/${taskId}`, { token: tokenA });
  assert.strictEqual(get.status, 404);
});

test('unknown routes and malformed JSON return clean errors', async () => {
  const unknown = await request('GET', '/api/unknown');
  assert.strictEqual(unknown.status, 404);
  assert.strictEqual(unknown.body.success, false);

  const badJson = await request('POST', '/api/auth/login', { rawBody: '{ bad json' });
  assert.strictEqual(badJson.status, 400);
});
