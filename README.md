# Mini invoice approval desk

**Developer:** [Ahsan Mahmood](https://aoneahsan.com) · [GitHub](https://github.com/aoneahsan) · [Email](mailto:aoneahsan@gmail.com)

A small invoice review desk for Sledge's Full Stack Engineer take-home task. It includes a TypeScript REST API, a React web UI, and a local SQLite database. Five sample invoices appear on first run, including one marked as a possible duplicate.

<a id="run-locally"></a>
## 🚀 Run locally&nbsp;[#](#run-locally)

Requires Node.js 24 or newer and Yarn 4.

```sh
yarn install
yarn dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:3001`. The SQLite file is created at `data/invoices.sqlite` and is ignored by Git.

To run the production build locally:

```sh
yarn build
yarn start
```

Open `http://localhost:3001`. Set `PORT` or `DB_PATH` to change the server port or SQLite file location.

<a id="workflow"></a>
## 🧾 Workflow&nbsp;[#](#workflow)

The desk has Processing, Needs review, and Approved–Rejected tabs. Select an invoice to see its details. Approve and Reject are available only in Needs review; decisions are saved to SQLite and remain after a restart. The possible duplicate links to the earlier invoice so the reviewer can compare them before deciding.

Processing represents an upstream intake step outside this demo. Those invoices are read-only. Approved and Rejected are final. The sample duplicate is explicitly linked to its original; this demo does not run general duplicate detection.

<a id="api"></a>
## 🔌 API&nbsp;[#](#api)

| Method | Path | Result |
| --- | --- | --- |
| `GET` | `/api/invoices` | `{ "invoices": Invoice[] }`, newest issue date first |
| `GET` | `/api/invoices/:id` | `{ "invoice": Invoice }` |
| `PATCH` | `/api/invoices/:id/status` | Accepts `{ "status": "approved" }` or `{ "status": "rejected" }`; returns `{ "invoice": Invoice }` |

The API uses `400` for invalid input, `404` for missing invoices, and `409` when the invoice no longer needs review. Errors use `{ "error": { "code": string, "message": string } }`.

<a id="schema-and-statuses"></a>
## 🗃️ Schema and statuses&nbsp;[#](#schema-and-statuses)

The `invoices` table stores `id`, vendor, invoice number, issue and due dates, description, integer `amount_cents`, currency, status, optional `duplicate_of` reference, and creation/update timestamps. Money uses cents to avoid floating-point totals. Dates are ISO date strings. The database constrains status to `processing`, `needs_review`, `approved`, or `rejected`.

Only `needs_review → approved` and `needs_review → rejected` are allowed by the API. The update checks the current status in the SQL statement, so a second decision cannot overwrite the first.

<a id="checks-and-reset"></a>
## ✅ Checks and reset&nbsp;[#](#checks-and-reset)

```sh
yarn typecheck
yarn test
yarn build
```

To restore the five sample invoices, stop the server and delete `data/invoices.sqlite`, then start it again. This removes local review decisions. The app has no sign-in because the task is a single-user local demo; do not expose it as a public multi-user service without authentication and authorization.
