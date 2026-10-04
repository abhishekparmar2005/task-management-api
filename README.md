# Task Management REST API

## Project Overview

A REST API for a basic task management system. Users can register, log in and manage their own tasks. Every task belongs to the user who created it, and no one else can read, change or delete it.

This project was built for the Backend Developer technical assignment.

## Features

- User registration and login with JWT authentication
- Password hashing with bcryptjs
- Get the logged-in user's profile
- Create, view, update and delete tasks
- Tasks are private to their owner
- Search by title/description, filter by status and priority, pagination
- Request validation with express-validator
- Centralized error handling with consistent JSON responses
- Basic security with helmet and CORS

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JSON Web Tokens (jsonwebtoken)
- bcryptjs, express-validator, helmet, cors, dotenv

## Project Structure

```
task-management-api/
├── src/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   └── taskController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── errorMiddleware.js
│   │   └── validationMiddleware.js
│   ├── models/
│   │   ├── Task.js
│   │   └── User.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── taskRoutes.js
│   ├── utils/
│   │   └── AppError.js
│   ├── app.js
│   ├── constants.js
│   └── server.js
├── tests/
│   └── api.test.js
├── postman/
│   └── Task-Management-API.postman_collection.json
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Prerequisites

- Node.js 18 or higher
- A MongoDB database: a local MongoDB installation or a free MongoDB Atlas cluster

## Installation

```bash
git clone <your-repository-url>
cd task-management-api
npm install
```

## Environment Variables

Copy the example file and fill in your own values:

```bash
cp .env.example .env
```

| Variable         | Description                                                | Example                              |
| ---------------- | ---------------------------------------------------------- | ------------------------------------ |
| `PORT`           | Port the server listens on                                 | `5000`                               |
| `MONGODB_URI`    | MongoDB connection string                                  | `mongodb://127.0.0.1:27017/task_api` |
| `JWT_SECRET`     | Secret used to sign tokens. Use a long random string       | `your_jwt_secret`                    |
| `JWT_EXPIRES_IN` | Token lifetime                                             | `7d`                                 |

`CORS_ORIGIN` is an optional extra variable. It defaults to `*` (any origin). Set it to your frontend URL to restrict access.

You can generate a strong secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Running the Project

```bash
npm start       # run the server
npm run dev     # run with nodemon (auto-restart on changes)
```

The API is available at `http://localhost:5000`. Opening that URL in a browser returns a short "API is running" message.

### Automated tests

```bash
npm test
```

The tests start the app and run the full flow (auth, CRUD, search, filters, pagination, ownership) against the database in `MONGODB_URI`. They create their own users and tasks and delete them when finished, but it is still best to point `MONGODB_URI` at a separate test database.

## API Endpoints

| Method | Endpoint             | Auth | Description                       |
| ------ | -------------------- | ---- | --------------------------------- |
| POST   | `/api/auth/register` | No   | Register a new user               |
| POST   | `/api/auth/login`    | No   | Log in and receive a JWT          |
| GET    | `/api/auth/profile`  | Yes  | Get the logged-in user's profile  |
| POST   | `/api/tasks`         | Yes  | Create a task                     |
| GET    | `/api/tasks`         | Yes  | List your tasks (search, filter, pagination) |
| GET    | `/api/tasks/:id`     | Yes  | Get one of your tasks             |
| PUT    | `/api/tasks/:id`     | Yes  | Update one of your tasks          |
| DELETE | `/api/tasks/:id`     | Yes  | Delete one of your tasks          |

### Task fields

| Field         | Rules                                                          |
| ------------- | -------------------------------------------------------------- |
| `title`       | Required, max 100 characters                                   |
| `description` | Optional, max 1000 characters                                  |
| `status`      | `Pending` (default), `In Progress`, `Completed`                |
| `priority`    | `Low`, `Medium` (default), `High`                              |
| `dueDate`     | Optional, valid ISO date such as `2026-12-31`                  |
| `createdDate` | Set by the server automatically                                |

Registration requires a name (2-50 characters), a valid email and a password of 8-72 characters.

`PUT /api/tasks/:id` accepts any of the task fields. Send only the ones you want to change.

## Authentication

Log in to get a token, then send it in the `Authorization` header of every protected request:

```
Authorization: Bearer <token>
```

A missing, invalid or expired token returns `401`.

Task queries always include the authenticated user's ID. If you request a task that belongs to someone else, the API responds with `404 Task not found`, the same as for a task that does not exist, so other users' task IDs are not revealed.

## Search / Filtering / Pagination

`GET /api/tasks` supports these optional query parameters:

| Parameter  | Description                                                   | Default |
| ---------- | ------------------------------------------------------------- | ------- |
| `search`   | Case-insensitive match against title or description           | none    |
| `status`   | `Pending`, `In Progress` or `Completed`                       | none    |
| `priority` | `Low`, `Medium` or `High`                                     | none    |
| `page`     | Page number (1 or higher)                                     | `1`     |
| `limit`    | Tasks per page (1 to 100)                                     | `10`    |

Parameters can be combined. Results are sorted newest first.

```
GET /api/tasks?search=project&status=Completed&priority=High&page=1&limit=10
```

## Postman Testing

1. Start the server.
2. Import `postman/Task-Management-API.postman_collection.json` into Postman.
3. Run the requests in order: **Register**, **Login**, **Create Task**, then the rest.

The collection uses these variables:

- `baseUrl` - defaults to `http://localhost:5000`
- `token` - filled in automatically by the Login request
- `taskId` - filled in automatically by the Create Task request
- `userName`, `userEmail`, `userPassword` - sample values used by Register and Login. Change them if you like.

All requests use the saved `token` through the collection's Bearer authorization. The collection also includes search, status filter, priority filter and pagination examples, plus a few error cases. You can run the whole collection with the Collection Runner.

## Example Requests

Register:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"testuser@example.com","password":"Password123"}'
```

Login:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"Password123"}'
```

Create a task:

```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Finish project report","description":"Write the final section","status":"In Progress","priority":"High","dueDate":"2026-12-31"}'
```

List completed tasks:

```bash
curl "http://localhost:5000/api/tasks?status=Completed&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

Update a task:

```bash
curl -X PUT http://localhost:5000/api/tasks/<taskId> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status":"Completed"}'
```

## Example Responses

Login (`200`):

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "<jwt>",
    "user": {
      "_id": "665f1c2e8a1b2c3d4e5f6a7b",
      "name": "Test User",
      "email": "testuser@example.com",
      "createdAt": "2026-01-01T10:00:00.000Z",
      "updatedAt": "2026-01-01T10:00:00.000Z"
    }
  }
}
```

Get tasks (`200`):

```json
{
  "success": true,
  "message": "Tasks fetched successfully",
  "data": {
    "tasks": [
      {
        "_id": "665f1d008a1b2c3d4e5f6a80",
        "user": "665f1c2e8a1b2c3d4e5f6a7b",
        "title": "Finish project report",
        "description": "Write the final section",
        "status": "In Progress",
        "priority": "High",
        "dueDate": "2026-12-31T00:00:00.000Z",
        "createdDate": "2026-01-01T10:05:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalTasks": 1,
      "limit": 10
    }
  }
}
```

Validation error (`400`):

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Please provide a valid email" },
    { "field": "password", "message": "Password must be between 8 and 72 characters" }
  ]
}
```

Other errors use the same shape without `errors`:

```json
{ "success": false, "message": "Task not found" }
```

Status codes used: `200`, `201`, `400` (validation / invalid id), `401` (auth / invalid credentials), `404` (not found), `409` (duplicate email), `500` (unexpected error, generic message only).

## GitHub setup

```bash
git init
git add .
git commit -m "Task Management REST API"
git branch -M main
git remote add origin <your-repository-url>
git push -u origin main
```

`.env` is listed in `.gitignore`, so your secrets are not committed. Only `.env.example` is.
