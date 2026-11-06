# API contract

Frontend and backend both follow this file. If a route needs to change, update this file in the same PR and tell the team.

- Base URL: `/api` (Vite proxies it to `http://localhost:5000` in development)
- All bodies are JSON
- Protected routes need the header `Authorization: Bearer <token>`
- IDs are MongoDB ObjectId strings, returned as `_id`
- Dates without time (exam date, due date) are `"YYYY-MM-DD"` strings

## Errors

Every error has the same shape:

```json
{ "error": "Readable message for the user", "details": [{ "field": "email", "message": "Invalid email" }] }
```

`details` is only present for validation errors.

| Status | When |
| --- | --- |
| 400 | Invalid input (Zod failed) |
| 401 | No token, bad token or expired token |
| 404 | Not found, **or it belongs to another user** (never reveal other users' data) |
| 409 | Email already registered |
| 500 | Server error |

---

## Day 2: Auth (F1)

### POST /api/auth/signup

```json
// request
{ "name": "Sneha", "email": "sneha@example.com", "password": "min8chars", "timezone": "Asia/Kolkata" }
```

- `name` 1–50 chars, `email` valid, `password` at least 8 chars, `timezone` optional (default `Asia/Kolkata`)

```json
// 201 response
{
  "token": "eyJhbGciOi...",
  "user": { "_id": "...", "name": "Sneha", "email": "sneha@example.com", "timezone": "Asia/Kolkata", "dailyReviewLimit": 100, "dailyNewLimit": 20, "createdAt": "..." }
}
```

409 if the email is already registered.

### POST /api/auth/login

```json
// request
{ "email": "sneha@example.com", "password": "min8chars" }
```

200 with the same `{ token, user }` shape as signup. 401 with `"Invalid email or password"` if either is wrong (do not say which one).

### GET /api/auth/me (protected)

```json
// 200 response
{ "user": { "_id": "...", "name": "Sneha", "email": "...", "timezone": "...", "dailyReviewLimit": 100, "dailyNewLimit": 20, "createdAt": "..." } }
```

The frontend calls this on page load to check if the saved token is still valid.

---

## Day 2: Subjects (F2, F3), all protected

Subject object:

```json
{ "_id": "...", "userId": "...", "name": "Physics", "examDate": "2026-12-10", "createdAt": "..." }
```

`examDate` is `null` when not set.

| Method | Route | Body | Response |
| --- | --- | --- | --- |
| GET | `/api/subjects` | none | 200 `[subject, ...]`, newest first, only the logged-in user's |
| POST | `/api/subjects` | `{ "name": "Physics", "examDate": "2026-12-10" }` (`examDate` optional) | 201 `subject` |
| PATCH | `/api/subjects/:id` | `{ "name"?: "...", "examDate"?: "YYYY-MM-DD" or null }` | 200 `subject` |
| DELETE | `/api/subjects/:id` | none | 204, also deletes its notes, decks, cards and reviews |

Rules:
- `name` 1–100 chars
- `examDate` in the past → 400 `"Exam date cannot be in the past"` (compare in the user's time zone; today is allowed)
- Wrong id or someone else's subject → 404

---

## Day 2: Decks (F2), all protected

Deck object:

```json
{ "_id": "...", "subjectId": "...", "name": "Chapter 1: Motion", "cardCount": 0, "createdAt": "..." }
```

`cardCount` is included in list responses so the UI can show "12 cards".

| Method | Route | Body | Response |
| --- | --- | --- | --- |
| GET | `/api/subjects/:id/decks` | none | 200 `[deck, ...]` |
| POST | `/api/subjects/:id/decks` | `{ "name": "Chapter 1" }` | 201 `deck` |
| PATCH | `/api/decks/:id` | `{ "name": "..." }` | 200 `deck` |
| DELETE | `/api/decks/:id` | none | 204, also deletes its cards and their reviews |

Rules:
- `name` 1–100 chars
- A deck belongs to the user through its subject: check `subject.userId === req.userId`, otherwise 404
