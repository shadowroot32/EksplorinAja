# Distributed rate limiter design

Status: proposed design; not implemented. The current `src/lib/rate-limit.ts` stores counters in a process-local `Map`, so limits are not shared across application instances and disappear on restart.

## Goals and non-goals

- Enforce anti-abuse controls consistently across concurrent application instances.
- Keep the product fully free: these are request-abuse protections, not feature quotas, paid tiers, or per-user usage allowances.
- Avoid touching production infrastructure or applying database migrations as part of this design-only change.
- Keep the current caller behavior documented before replacing the synchronous helper with an asynchronous storage-backed API.

## Preferred first implementation: PostgreSQL atomic fixed window

PostgreSQL is already part of the application stack. Prefer it over introducing a new Redis service or deployment secret for the first implementation, provided production database capacity and connection-pool behavior are reviewed.

Create a dedicated table (rather than changing the existing `rate_limits` table in place until its usage and data are verified) with:
- a stable bucket key (opaque keyed digest, not a raw email or IP address);
- an action name;
- a hit count;
- the start of the active window and an expiry/cleanup timestamp;
- a unique constraint on the bucket key and action.

For each check, use a single parameterized SQL statement and `INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING` so the increment and window rollover are atomic across instances. The allowed decision must be derived from the post-increment count in the same database operation. Do not implement a read-then-write sequence: concurrent requests could all observe the same old count and exceed the limit.

The key should be derived from a server-side HMAC secret and a normalized identifier/action, so database rows do not directly expose raw email addresses or IPs. Reuse an existing stable server secret only after confirming its lifecycle and availability in every runtime; otherwise introduce a dedicated secret with a documented rotation/deployment plan. Never use a client-supplied identity as the sole identifier.

## API and failure behavior

- Replace the synchronous helper with an asynchronous storage-backed interface only after inventorying every caller and updating all call sites in one reviewed change.
- Validate action names, identifier length, positive integer limits, and window duration at the boundary.
- Apply timeouts to database work and keep queries parameterized.
- Define failure policy by endpoint: authentication/OTP abuse controls should fail closed if the shared limiter is unavailable; non-sensitive endpoints may use a documented bounded fallback only if it cannot silently defeat the intended protection. Do not silently fall back to independent per-instance counters and claim the global limit is enforced.
- Return only the existing minimum response information needed by callers. Avoid exposing identifiers, SQL errors, or internal configuration.
- Expire old buckets with bounded, scheduled/batched cleanup; avoid unbounded table growth and avoid a full-table delete on request paths.
- Do not use rate limiting as a billing or learning-feature quota.

## Tests required before calling the foundation complete

### Unit tests
- first request, allowed requests up to the boundary, blocked request at the boundary;
- rollover immediately before, at, and after window expiry;
- invalid inputs and stable opaque key generation;
- database timeout/error behavior for each endpoint policy;
- ensure response metadata does not leak identifiers or internal errors.

### PostgreSQL integration tests (disposable test database only)
- two independent limiter instances sharing one database see the same counter;
- concurrent requests do not exceed the configured fixed-window count;
- expired windows reset correctly;
- uniqueness and upsert behavior hold under contention;
- cleanup only removes expired rows and is bounded.

CI should provision an isolated PostgreSQL service for these tests, or explicitly report the integration suite as skipped when no test database is available. Do not point tests at production.

## Rollout sequence

1. Inventory all current callers and their endpoint-specific failure requirements.
2. Add the dedicated schema/migration and storage implementation with deterministic unit tests.
3. Add disposable-PostgreSQL integration tests for cross-instance and concurrency behavior.
4. Convert every caller to await the shared limiter; review auth and OTP behavior carefully.
5. Run the full CI suite and review migration SQL and operational load.
6. Only after explicit approval, plan production migration/deployment and monitoring. No production changes are authorized by this document.

## Known caveats

A PostgreSQL-backed limiter is only as available as the database and can add write load to hot endpoints. The implementation must be checked against the actual hosting platform's connection limits, pooling, request timeout, and transaction behavior. If those constraints make PostgreSQL unsuitable, evaluate a managed shared Redis-compatible store as a separate architecture decision rather than silently switching providers.
