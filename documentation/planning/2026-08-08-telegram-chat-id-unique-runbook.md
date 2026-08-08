# telegram_configs.chat_id unique constraint — migration runbook

**Issue:** #155 · **Change:** `chatId: text("chat_id").notNull()` → `.notNull().unique()`

The code half of #155 (private-chats-only guard) ships in the same PR and needs no
migration. **This document covers the schema half, which is human-run**, following the
same shape as `2026-07-30-cluster1-partB-mfa-migration-runbook.md`.

## Why this cannot just be pushed

`drizzle-kit push` will attempt `ALTER TABLE telegram_configs ADD CONSTRAINT ... UNIQUE
(chat_id)`. **Postgres rejects that outright if duplicate `chat_id` values already
exist** — and duplicates are exactly the state #155 describes, so they are plausible in
prod rather than hypothetical.

The push either fails cleanly (no harm, but no fix) or, if run without reading the
prompt, leaves the operator believing the constraint landed when it did not. Check
first.

**I could not check.** There is no `DATABASE_URL` in the environment I ran in, so I have
neither counted the duplicates nor executed the push. Everything below is unverified
against a live database and needs someone with prod access. That is the honest state:
the guard is tested, the constraint is not.

## Step 1 — Count duplicates on a Neon branch, never prod first

Create a throwaway Neon branch of production, then:

```sql
SELECT chat_id, count(*) AS bindings, array_agg(user_id) AS accounts
FROM telegram_configs
GROUP BY chat_id
HAVING count(*) > 1
ORDER BY bindings DESC;
```

**Zero rows** → skip to Step 3.

**Any rows** → each one is a live instance of the #155 leak. Every listed `user_id`
after the first has been able to read the others' `/summary` output.

## Step 2 — Resolve duplicates before adding the constraint

There is no safe automatic winner: the rows represent *different people's* accounts
bound to one chat, and picking one silently re-points another person's alerts. So this
is a decision, not a script.

Suggested resolution, in preference order:

1. **Unbind all of them** — delete every row in a duplicated `chat_id` group. Each
   affected user re-links from Settings, in a DM, and gets a working binding. This is
   the only option that does not silently choose on a user's behalf, and the re-link
   flow already exists.
2. Keep the **oldest** binding (`ORDER BY created_at ASC LIMIT 1`) and delete the rest,
   if you would rather not disrupt the original binder.

Whichever is chosen, **record the affected `user_id`s before deleting** — they are the
users whose financial summaries were exposed, which is the population any disclosure
notice would concern.

```sql
-- capture first
SELECT * FROM telegram_configs WHERE chat_id IN (
  SELECT chat_id FROM telegram_configs GROUP BY chat_id HAVING count(*) > 1
);
-- then resolve per the decision above
```

## Step 3 — Push the constraint to the branch

```bash
DATABASE_URL="<neon-branch-connection-string>" npm run db:push
```

`drizzle-kit push` prints its statements before applying. It should propose **only** the
unique constraint on `telegram_configs.chat_id`. If it proposes anything else, stop —
the branch has drifted from `schema.ts` and that is a separate problem.

Re-run the Step 1 query afterwards; it must return zero rows.

## Step 4 — Repeat against production

Same two commands, prod connection string, after Step 2 has been applied to prod's own
duplicates. The constraint is the last step, not the first.

## After

With the constraint in place, two chat-keyed behaviours in
`src/app/api/telegram/webhook/route.ts` stop being ambiguous rather than merely
unlikely:

- `/summary` selects with `limit(1)` and **no `ORDER BY`**, so with duplicates present it
  served an arbitrary account's data. With at most one row per chat, the row it finds is
  the only row.
- `/pause` and `/resume` update **every** row matching the chat id, so one account could
  silence another's alerts. At most one row makes that a no-op.

Neither of those is fixed by the private-chat guard, which is why both halves of #155
are needed.
