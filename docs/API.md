# API

## Auth

### PATCH /api/auth/me

Updates settings for the authenticated user. Requires a valid bearer token.

At least one supported field is required:

| Field | Constraints |
| --- | --- |
| `name` | 1–50 characters |
| `timezone` | Valid IANA time zone, such as `Asia/Kolkata` |
| `dailyReviewLimit` | Integer from 1 to 500 |
| `dailyNewLimit` | Integer from 1 to 100 |

`email` and `password` cannot be updated through this endpoint. Unknown fields are rejected.

Example request:

```http
PATCH /api/auth/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Sneha",
  "timezone": "Asia/Kolkata",
  "dailyReviewLimit": 100,
  "dailyNewLimit": 20
}
```

Successful response (`200`):

```json
{
  "user": {
    "name": "Sneha",
    "email": "sneha@example.com",
    "timezone": "Asia/Kolkata",
    "dailyReviewLimit": 100,
    "dailyNewLimit": 20
  }
}
```

Invalid input returns `400`; a missing or invalid token returns `401`.

## Stats

### GET /api/stats/overview

Returns the authenticated user's study streak, a 365-day review heatmap, and
per-subject card progress. Dates use the user's configured time zone. The
heatmap includes only dates with reviews. A learned card has been reviewed at
least once (`isNewCard: false`); a mastered card has at least three successful
SM-2 repetitions. `dueToday` counts cards due on or before today. `daysLeft` is
`null` when the subject has no exam date.

Requires a valid bearer token. Example response:

```json
{
  "date": "2026-11-10",
  "streak": { "current": 5, "longest": 12, "studiedToday": true },
  "heatmap": [{ "date": "2026-11-09", "count": 23 }],
  "subjects": [{
    "_id": "6730000000000000000000aa",
    "name": "Physics",
    "examDate": "2026-12-10",
    "daysLeft": 30,
    "totalCards": 40,
    "learnedCards": 25,
    "masteredCards": 8,
    "dueToday": 6
  }]
}
```
