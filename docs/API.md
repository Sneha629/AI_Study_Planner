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

### GET /api/subjects/:id/plan (F10)

Returns an exam preparation plan for the authenticated user's subject.

Requires a valid bearer token.

Example response (`200`):

```json
{
  "daysLeft": 12,
  "totalCards": 40,
  "newCardsLeft": 20,
  "dueToday": 6,
  "newPerDay": 3,
  "status": "on-track",
  "schedule": [
    {
      "date": "2026-11-12",
      "newCards": 3,
      "reviews": 0
    },
    {
      "date": "2026-11-13",
      "newCards": 3,
      "reviews": 3
    }
  ]
}
```

Response fields:

| Field | Description |
| --- | --- |
| `daysLeft` | Days remaining until the exam, based on the user's time zone. `null` when no exam date is set. |
| `totalCards` | Total cards across all decks in the subject. |
| `newCardsLeft` | Cards that have not yet been reviewed. |
| `dueToday` | Cards due on or before today, including overdue cards. |
| `newPerDay` | New cards required per day, rounded up, to finish at least 3 days before the exam. `null` when no exam date is set or no preparation days are available. |
| `status` | `on-track`, `behind`, or `no-exam`. |
| `schedule` | Daily new-card and review counts for the next 7 calendar days. |

Planning rules:

- New cards should be completed at least 3 days before the exam so they can be revised.
- `newPerDay` = ceiling of `newCardsLeft / (daysLeft - 3)`, when available days are positive.
- `on-track` means the required daily new-card count does not exceed the user's `dailyNewLimit`.
- `behind` means the required daily count exceeds the limit, or pending new cards cannot be completed before the 3-day revision buffer.
- `no-exam` is returned when `examDate` is null. In this case, `daysLeft` and `newPerDay` are null.
- Existing review cards are counted on their due date; overdue cards count as due today.
- Newly planned cards contribute their first revision to the following day.
- The schedule displays only the next 7 calendar days; `newPerDay` is calculated across the full available preparation period.

Errors:

- Invalid subject ID or another user's subject → `404`
- Missing or invalid token → `401`

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

---

## Day 3: Cards (F4), all protected

Card object:

```json
{
  "_id": "...", "deckId": "...", "front": "What is velocity?", "back": "Speed with direction",
  "source": "manual", "noteId": null,
  "easeFactor": 2.5, "intervalDays": 0, "repetitions": 0, "dueDate": "2026-11-07", "isNewCard": true,
  "createdAt": "..."
}
```

The SM-2 fields (`easeFactor`, `intervalDays`, `repetitions`, `dueDate`, `isNewCard`) are set by the server. The client never sends them.

| Method | Route | Body | Response |
| --- | --- | --- | --- |
| GET | `/api/decks/:id/cards` | none | 200 `[card, ...]`, oldest first |
| POST | `/api/decks/:id/cards` | `{ "front": "...", "back": "..." }` | 201 `card` |
| PATCH | `/api/cards/:id` | `{ "front"?: "...", "back"?: "..." }` (at least one) | 200 `card` |
| DELETE | `/api/cards/:id` | none | 204, also deletes its reviews |

Rules:
- `front` 1–500 chars, `back` 1–2000 chars, both trimmed
- Any other field in the body → 400
- A new card has `source: "manual"`, `isNewCard: true` and `dueDate` = today in the user's time zone, so it shows up in study mode right away
- Editing a card changes only its text; SM-2 progress is kept
- A card belongs to the user through deck → subject; wrong id or someone else's card → 404

---

## Day 4: Notes (F5), all protected

Upload a student's notes so AI can turn them into cards (F6). Only the text is kept; the file itself is not saved.

Note object (list and upload responses):

```json
{ "_id": "...", "subjectId": "...", "fileName": "chapter1.pdf", "fileType": "pdf", "textLength": 5230, "createdAt": "..." }
```

`GET /api/notes/:id` returns the same fields plus `extractedText` (the full text).

| Method | Route | Body | Response |
| --- | --- | --- | --- |
| GET | `/api/subjects/:id/notes` | none | 200 `[note, ...]`, newest first, without `extractedText` |
| POST | `/api/subjects/:id/notes` | `multipart/form-data` with one file in the field `file` | 201 `note`, without `extractedText` |
| GET | `/api/notes/:id` | none | 200 `note` with `extractedText` |
| DELETE | `/api/notes/:id` | none | 204; cards made from it are kept (their `noteId` becomes `null`) |

Rules:
- Only `.pdf` and `.txt`, at most 5 MB → otherwise 400
- A PDF with no text (a scanned photo of pages) → 400 `"No text found in this PDF..."`
- Password-protected or broken PDF → 400
- Wrong id or someone else's subject or note → 404

Frontend upload example:

```js
const form = new FormData()
form.append('file', fileInput.files[0])
await api.post(`/subjects/${subjectId}/notes`, form) // axios sets the multipart header itself
```

---

## Day 4: Study queue (F9), protected

### GET /api/study/due

The cards to study right now. Study mode (F7) shows them in this order.

Optional query: `?deckId=...` (one deck) or `?subjectId=...` (one subject). Without either, all the user's decks.

```json
// 200 response
{
  "date": "2026-11-08",
  "cards": [{ "...card fields...": "", "deckName": "Motion" }],
  "counts": { "review": 12, "new": 5 },
  "doneToday": { "review": 3, "new": 2 },
  "limits": { "review": 100, "new": 20 }
}
```

Rules:
- A card is due when `dueDate <= date` (today in the user's time zone)
- Review cards (`isNewCard: false`) come first, most overdue first; then new cards, oldest first
- Daily limits come from the user (`dailyReviewLimit`, `dailyNewLimit`). What was already studied today is subtracted, counted over **all** decks even when the queue is filtered
- A review with `intervalBefore: 0` is a card's first review and counts towards the new-card limit
- `cards: []` means nothing left for today (show "All done for today 🎉")
- Someone else's or a wrong `deckId` / `subjectId` → 404

---

## Day 5: Review a card (F7, F8), protected

### POST /api/cards/:id/review

Study mode calls this when the student presses a button after seeing the answer.

```json
// request
{ "rating": "good" }   // "again" | "hard" | "good" | "easy"
```

200 with the updated `card` (new `dueDate`, `intervalDays`, `repetitions`, `easeFactor`, `isNewCard: false`). The card then leaves today's queue (`GET /api/study/due`).

SM-2 rules (`server/src/services/sm2.js`):

| Button | What happens |
| --- | --- |
| Again | Forgot it: repetitions reset to 0, due tomorrow, ease unchanged |
| Hard | Next interval as below, ease −0.14 |
| Good | Next interval as below, ease unchanged |
| Easy | Next interval as below, ease +0.1 |

Next interval: 1st correct → 1 day, 2nd → 6 days, after that → previous interval × ease (rounded). Ease never goes below 1.3; a new card starts at 2.5.

Errors: bad `rating` or extra fields → 400 · wrong id or someone else's card → 404 · the same card reviewed twice at the same moment (double click) → 409

---

## Day 6: AI flashcards from notes (F6), protected

Flow: upload a note (F5) → `generate` (AI preview, nothing saved) → student edits/unticks → `cards` (save).

### POST /api/notes/:id/generate

```json
// request
{ "count": 20 }   // 10 | 20 | 30
// 200 response
{
  "noteId": "...",
  "suggestedDeckName": "Chapter 3 motion",
  "cards": [{ "front": "What is inertia?", "back": "Resistance to a change in motion" }],
  "usedAllText": true
}
```

- Takes 5–30 seconds. Long notes are split into up to 4 parts spread across the note; `usedAllText: false` means some parts were skipped
- At most 10 generations per user per 10 minutes → 429
- AI busy / free limit used up / AI not set up → 429, 503 or 502 with a readable `error` to show the user

### POST /api/notes/:id/cards

```json
// request: new deck
{ "deckName": "Chapter 3 motion", "cards": [{ "front": "...", "back": "..." }] }
// or existing deck in the same subject
{ "deckId": "...", "cards": [...] }
// 201 response
{ "deck": { "_id": "...", "name": "Chapter 3 motion", "cardCount": 20, "...": "" }, "saved": 20 }
```

- Send exactly one of `deckId` or `deckName`; 1–50 cards; same `front`/`back` limits as manual cards
- Saved cards have `source: "ai"`, `noteId`, and are due today, so they show up in study mode immediately
- A deck from another subject or user → 404

Server config (`server/.env`): `LLM_API_KEY` (required), optional `LLM_BASE_URL`, `LLM_MODEL` (default `gemini-3.5-flash-lite`), `LLM_FALLBACK_MODEL` (default `gemini-3.8-flash`, tried when the main model is busy).

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
