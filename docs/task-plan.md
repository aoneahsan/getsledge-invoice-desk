# Mini invoice approval desk — implementation plan

Last Updated: 2026-10-06

Developer: Ahsan Mahmood

## Goal and scope

Deliver a private GitHub repository with a TypeScript REST API, a responsive web UI, five seeded invoices including one explicit duplicate, persisted approval decisions, and a concise README. The audio recording and email reply remain with Ahsan. Sledge reviewer access remains with Ahsan.

## Paths and implementation order

1. Create `prototype/invoice-desk.html` as a focused, reviewable static desk with working tab, detail, and decision interactions. Obtain Ahsan's UI approval before production UI implementation.
2. Build shared invoice types in `src/shared/invoice.ts`, SQLite initialization and seed in `src/server/db.ts`, and REST routes in `src/server/app.ts`. Store the SQLite file under ignored `data/` and seed only if no invoices exist.
3. Build the production React UI in `src/client/` from the approved prototype, using the REST API and translated UI strings. Configure Vite for development and Express to serve the built UI.
4. Add meaningful API and UI tests, scripts, README, and `.gitignore`; verify the production build and local run. Initialize Git, create a private `aoneahsan/getsledge-invoice-desk` repository, fetch/merge before commit and push, then push directly to the primary branch without a PR.

## Data and API

SQLite `invoices`: `id` text primary key; `vendor`, `invoice_number`, `issue_date`, `due_date`, `description`, `currency`, `status`, `created_at`, `updated_at` text; `amount_cents` integer; `duplicate_of` nullable text self-reference. Status is one of `processing`, `needs_review`, `approved`, `rejected` through a database `CHECK` constraint. Dates are ISO date strings; money remains integer cents. The seed contains one Processing, two Needs review, one Approved, and one Rejected invoice; exactly one Needs review row points to the Approved original.

`GET /api/invoices` returns a list in descending issue-date order. `GET /api/invoices/:id` returns one invoice. `PATCH /api/invoices/:id/status` accepts `{ "status": "approved" | "rejected" }` only when the stored status is `needs_review`; it updates `updated_at` and returns the invoice. Invalid input returns 400, missing IDs 404, and disallowed transitions 409. Use prepared statements and a conditional update so simultaneous decisions cannot overwrite one another. No authentication or invoice creation is in scope for this single-user local demo.

## UI and edge cases

The three tabs are Processing, Needs review, and Approved–Rejected. Each row opens a detail view. Processing is read-only; Needs review shows Approve/Reject; decided invoices are read-only. The duplicate has a warning and a link to the original invoice. Handle loading, empty, API error, and decision-in-progress states. Refresh list/detail after a decision while retaining the current selection when possible. Keep mobile and keyboard navigation usable. Every visible string passes through the English translation function. Credits name Ahsan in each authored source/document file where the format permits, in `package.json` metadata for JSON, and in the README. Exclude lockfiles, generated files, and the DB.

## Verification, security, and delivery

Run `yarn typecheck`, `yarn test`, `yarn build`, and a manual production smoke test. Test seed idempotency, duplicate relation, list/get, validation, missing ID, permitted and rejected transitions, and persisted status after server restart. Check tabs, details, decisions, narrow layout, focus, and empty/error states manually. Do not commit the database or credentials. Review the complete diff against this plan and fix findings. Roll back an uncommitted implementation with Git; after push, use a normal revert commit. Reset demo data only by deleting the ignored local database. Success means a reviewer can follow README setup and observe a decision surviving a restart. No deployment is planned.

## Decisions

- Focused prototype and compact UI approval replace the full multi-stage click-dummy process for this take-home, as Ahsan chose in this conversation.
- Sledge's GitHub reviewer account is not yet known; Ahsan will grant private repository access himself.
- Ahsan approved the focused UI direction on 2026-10-06: “Approve this direction.”
