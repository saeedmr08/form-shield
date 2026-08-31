# Security notes — FormShield

- **Honeypot:** A hidden field should stay empty for humans. Filled values are treated as bots.
- **Rate limit:** In-memory buckets reset on process restart and do not sync across instances.
- **Encryption simulation:** XOR + base64 is a teaching stand-in for field encryption at rest — replace with real KMS/AES in production.
- **Retention:** `applyRetention` deletes expired rows from the in-memory store; wire to a cron or request hook.
- **Validation:** Client UI mirrors rules; enforcement lives on the server route.
