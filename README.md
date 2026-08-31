# FormShield

Portfolio form defense demo by **Saeed Rumaneh**. Shared field validation, honeypot bot trap, in-memory rate limiting, field encryption-at-rest simulation (server-only), and retention purge — with submissions written to disk.

## Features

- Rule-based validation (`lib/formshield.ts`)
- Honeypot field rejection (`companyHoneypot`)
- Sliding-window rate limit (in-memory per process)
- XOR encryption simulation for sensitive fields — **Buffer / encrypt only in the API route**
- Retention window with purge helper
- Persisted submissions in `data/submissions.json` (gitignored)

## API

`POST /api/submit` with `{ name, email, message, companyHoneypot, ip? }`.

- Validation errors → `400` + `issues`
- Rate limited → `429`
- Honeypot filled → silent success (`id: "dropped"`)
- Accepted → encrypted fields stored; returns `id`, `remaining`, `retainUntil`

`GET /api/submissions` applies retention, then returns `{ submissions }` with ciphertext still encrypted.

## Complete product flows

1. Click **Fill valid**, then submit — the inbox lists a new row with encrypted field values.
2. Click **Show validation** — invalid email and a short message surface as field issues; the inbox does not grow.
3. Click **Honeypot bot** — the response looks accepted (`id: dropped`) but the inbox stays unchanged.

## Scripts

```bash
npm install
npm run dev
npm test
npm run typecheck
```

## License

MIT © 2026 Saeed Rumaneh
