# System Review — Filed Issues Map

_Generated 2026-07-07 from the full-system review (`00_SYSTEM_REVIEW.md`)._

This maps each new review finding to the GitHub issue it was filed under. P0 and P1
findings were filed as individual issues; P2/P3 findings were filed as clustered tracking
issues (one per severity). The review surfaced no new P4 items and no new nice-to-have
enhancements (product ideas already live in issues #47–#60).

## Individual issues

| Finding | Severity | Issue | Title |
|---------|----------|-------|-------|
| NEW-1 | P0 | [#135](https://github.com/chrisrogers37/really-personal-finance/issues/135) | profile update silently resets `role` and `mfaEnabled` (privilege regression + MFA bypass) |
| NEW-4 | P1 | [#136](https://github.com/chrisrogers37/really-personal-finance/issues/136) | no CI pipeline — tests/lint/typecheck/audit never run automatically |

## Clustered issues

| Cluster | Severity | Issue | Findings covered |
|---------|----------|-------|------------------|
| P2 group | P2 | [#137](https://github.com/chrisrogers37/really-personal-finance/issues/137) | NEW-2 (build hermeticity), NEW-3 (red lint), NEW-5 (Plaid item removal), NEW-6 (dep vulns), NEW-7 (auth round-trips), NEW-8 (SCD2 in-place writes) |
| P3 group | P3 | [#138](https://github.com/chrisrogers37/really-personal-finance/issues/138) | NEW-9 (middleware deprecation), NEW-10 (sync rate-limit), NEW-11 (typecheck script), NEW-12 (dashboard month label), NEW-13 (Plaid consent check), NEW-14 (atomic consent) |

## Already-tracked findings

Part 2 of `00_SYSTEM_REVIEW.md` cross-references findings that were confirmed still-present
but already have open issues (security, data/correctness, structural tech-debt, and Plaid
attestations). No new issues were filed for those; see the linked numbers in that document.

## Housekeeping note

Issue **#134** (`__perm_probe__`) was created accidentally while probing GitHub API write
permissions. The integration token used for this run can create issues but **cannot** close,
edit, comment on, or label existing issues (those GraphQL mutations return
`Resource not accessible by integration`). #134 should be closed manually by a maintainer.
