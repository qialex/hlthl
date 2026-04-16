# Conditions & Symptoms Admin

A full-stack admin interface for managing medical conditions and their linked symptoms.

## Running the app

```bash
docker compose up --build
```

The app will be available at **http://localhost:3002**.

Data persists between restarts via a named Docker volume (`dynamodb-data`).

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Bun | Faster installs and native TypeScript execution — no transpile step needed in Docker |
| Backend | Express (local shim) + Lambda handlers | Handlers are pure Lambda functions; Express only exists locally to satisfy the Docker requirement |
| Frontend | Vite + React | Lightweight, fast builds, no framework overhead |
| Component library | Mantine | Well-suited to admin UIs, works well with Vite, no Tailwind required |
| Data fetching | SWR | Simple loading/error states and automatic revalidation after mutations |
| Validation | Zod | Shared between backend and frontend — one schema, consistent errors everywhere |
| Database | DynamoDB Local | Matches the production target; runs in Docker with a persistent volume |

---

## DynamoDB data model

Three tables with a simple 3-table approach rather than single-table design.

### `Conditions`
| Key | Type | Notes |
|---|---|---|
| `id` (PK) | String | UUID |
| `name` | String | |

### `Symptoms`
| Key | Type | Notes |
|---|---|---|
| `id` (PK) | String | UUID |
| `name` | String | |

### `ConditionSymptoms`
| Key | Type | Notes |
|---|---|---|
| `conditionId` (PK) | String | |
| `symptomId` (SK) | String | |

The junction table models the many-to-many relationship. Both traversal directions are supported:

- **Condition → Symptoms**: query `ConditionSymptoms` by `conditionId` (uses the primary key — efficient)
- **Symptom → Conditions**: scan `ConditionSymptoms` with a `FilterExpression` on `symptomId` (acceptable at this scale)

**Why not single-table design?** Single-table DynamoDB is a powerful pattern for high-scale production systems with well-defined, stable access patterns. For this tool it would add complexity without benefit — the 3-table model is easier to reason about, easier to extend, and clearer to evaluate.

---

## Architecture decision: Lambda handlers locally

The backend handlers (`src/handlers/`) are pure AWS Lambda functions — they accept `APIGatewayProxyEvent` and return `APIGatewayProxyResult`. They have no knowledge of Express.

`src/local.ts` is a thin Express shim that adapts incoming HTTP requests into Lambda events and forwards the response back. It exists only to satisfy the `docker compose up` requirement.

In production, the same handler files would be deployed directly to Lambda behind API Gateway with zero changes.

---

## Shared layer

Domain types and Zod schemas live in a root-level `shared/` directory, owned by neither service:

```
shared/
  types.ts     — Condition, Symptom, ConditionSymptomLink
  schemas.ts   — Zod validation schemas
  index.ts     — clean re-export surface
```

The backend imports directly via relative path:
```ts
import { NameSchema } from "../../../shared/schemas";
import type { Condition } from "../../../shared/types";
```

The frontend imports via a Vite path alias:
```ts
import type { Condition } from "@shared/types";
import { NameSchema } from "@shared/schemas";
```

This means form validation in the UI uses the exact same Zod schema as the API. If a rule changes — minimum length, required fields — it updates in one place and both sides stay in sync automatically.

**Why not an npm workspace (`packages/shared`)?** For two small files, the overhead of a separate `package.json`, build step, and symlink management is not justified. The alias approach is pragmatic for this scale. An npm workspace would be the right call if the shared surface grew significantly or if the services needed to be deployed independently with versioned contracts.

---

## Why not Next.js?

Next.js was considered and rejected for two reasons. First, the brief requires a `docker compose up` setup that exposes the application cleanly on a single port — a standalone Vite + Express setup is simpler and more transparent in that context. Second, Next.js conflates the API layer and UI layer in a way that makes the architecture harder to evaluate. Keeping them separate makes the code clearer to a reviewer.

In production, the natural deployment target for this stack would be Lambda + API Gateway + DynamoDB (real) + a CDN-served static frontend — not a Next.js/Vercel deployment.

---

## Tradeoffs and next steps

**Tradeoffs made:**
- Symptom → Condition lookups use a scan with a filter rather than a GSI — correct results, higher read cost at scale
- No authentication — the brief explicitly excludes it
- No soft deletes — deleting a condition or symptom does not clean up its `ConditionSymptoms` links; a production system would handle this in a transaction
- Express shim instead of SAM/LocalStack — simpler Docker setup, but means local routing logic lives in `local.ts` rather than a `template.yml`

**What I'd do next:**
- Add a cleanup step on condition/symptom delete to remove orphaned `ConditionSymptoms` links using a DynamoDB `TransactWriteCommand`
- Add a GSI on `ConditionSymptoms` (`symptomId` as hash key) to replace the scan with an efficient query for the Symptom → Conditions direction
- Replace the Express shim with SAM local or CDK + LocalStack for a more faithful local Lambda environment
- Add integration tests against DynamoDB Local using a test container
- Add pagination to list endpoints
