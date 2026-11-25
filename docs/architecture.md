# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep React pages focused on rendering and interaction; use the shared API client for relative `/api` requests, with accessible loading, empty, and error states.
- Logic tier decision: Keep request validation, business rules, and response shaping in the Express API/services; return deliberate 4xx responses for invalid input and missing resources.
- Data tier decision: Use Mongoose models for required fields, references, defaults, and persistence. Keep seed data representative and idempotent without deleting unrelated records.
- Activity tracking approach: Validate IDs and referenced user/team existence before creating an activity; persist the submitted references and activity details with computed points and an occurrence date.
- Team management approach: Require a name, preserve the submitted name and mascot, and store members as user references; default omitted members to an empty array.
- Leaderboard approach: Aggregate activity points by team, sort descending, and shape results with team names and 1-based ranks.
- Workout suggestions approach: Find the requested user by email, use their goal or recent activity to choose matching workouts, and include a reason; return a deliberate 4xx when no user matches.

## Test plan

- `npm run test:data --prefix octofit-tracker/backend` checks model validation, defaults, and representative/idempotent seeding. A failure points to a data contract or seed behavior regression. **Latest run:** 4 of 5 tests failed: required User, Team, Activity, and Workout fields were not enforced; the seed test passed.
- `npm run test:api --prefix octofit-tracker/backend` checks activity/team creation and validation, leaderboard totals/ranking, and personalized workout suggestions. A failure indicates incorrect API behavior, response shape, or status handling. **Latest run:** 4 of 4 tests failed: activity/team requests returned `501` where validation was expected, the leaderboard was empty, and workout suggestions lacked the expected reason.
- `npm test --prefix octofit-tracker/frontend` checks API-backed rendering and accessible loading, empty, and error states across routes. A failure indicates a presentation/API-client integration or accessibility-state regression. **Latest run:** 15 of 15 tests failed, covering data rendering, user-specific workout requests, loading, empty, and error states.
- `npm run build --prefix octofit-tracker/backend` type-checks the backend. A failure indicates a backend TypeScript/build issue. **Latest run:** passed.
- `npm run build --prefix octofit-tracker/frontend` type-checks and creates the Vite production bundle. A failure indicates a frontend TypeScript or production-build issue. **Latest run:** passed.
