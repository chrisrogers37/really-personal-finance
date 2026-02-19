# Google OAuth Enhancement

**Session:** google-oauth
**Date:** 2026-02-19
**Status:** :white_check_mark: COMPLETE
**Scope:** Add Google OAuth as an alternative sign-in method alongside existing email magic links

## Context

The app currently uses email magic links as the sole authentication method. Every sign-in requires a full email round-trip (enter email, switch to inbox, click link, redirect back). This creates unnecessary friction, especially for returning users who just want to check their dashboard.

Adding Google OAuth provides a one-click sign-in path while preserving the email option as a fallback.

## Phases

| # | Title | Impact | Effort | Risk | Dependencies |
|---|-------|--------|--------|------|-------------|
| 01 | Add Google OAuth Sign-In | High | Low | Low | None |

**Single-phase session.** One PR covers all changes.

## Architecture Notes

- `authAccounts` table already exists in the Drizzle schema but is unused (stub adapter methods)
- NextAuth v5 Google provider is edge-safe but only needs to be in the full config (`auth.ts`), not the middleware config
- Database session strategy is unaffected — Google OAuth creates the same database sessions as email
- `allowDangerousEmailAccountLinking` is required so existing email users can also sign in with Google (safe because Google verifies email ownership)
