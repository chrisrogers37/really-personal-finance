# End-of-Life Software Monitoring and Update Policy

**Status:** DRAFT — not submittable. See §8 Open Decisions.
**Version:** 0.2
**Effective Date:** _pending — see §8_
**Last Reviewed:** 2026-08-21
**Owner:** Chris Rogers

## 1. Purpose

This policy defines how Really Personal Finance tracks the support status of the software it runs on, how end-of-life (EOL) components are identified before support ends, and the window in which they are upgraded.

## 2. Scope

Applies to components whose vendor publishes a support lifecycle and whose expiry would leave the application running unpatched code:

- The **runtime** (Node.js) used in CI and in production
- The **framework** (Next.js) and the React major it targets
- **Direct dependencies** that reach consumer data or authentication — currently `next-auth`, `plaid`, `drizzle-orm`, `@neondatabase/serverless`, `nodemailer`
- **Managed platforms** (Vercel, Neon), where the vendor controls the lifecycle and our obligation is to track announced deprecations

Transitive dependencies are governed by `policies/vulnerability-patching-policy.md`, not by this policy: they are tracked by advisory, not by lifecycle.

## 3. Tracked Component Inventory

Support dates are taken from the vendor's published schedule, not from a secondary source. Version cells re-measured against the tree 2026-08-21 (three rows moved with the first grouped dependency update, #165). For Node.js this is `nodejs/Release` `schedule.json`.

| Component | Version in this repository | Where pinned | Vendor EOL | Status (2026-08-20) |
|---|---|---|---|---|
| Node.js (CI) | **22** | `.github/workflows/ci.yml` (all three jobs) and `.github/workflows/security-scan.yml` | 2027-04-30 | **Current** — remediated 2026-08-21 (PRs #162, #170) from Node 20, which had been past its 2026-04-30 EOL for 113 days |
| Node.js (production) | _unknown_ | Not pinned in-repo; Vercel project setting | — | **Unverified — see §8.1** |
| Next.js | ^16.3.1 | `package.json` | _not verified — see §8.5_ | Currency not assessed |
| React | 19.2.8 | `package.json` | _not verified — see §8.5_ | Currency not assessed |
| `next-auth` | ^5.0.0-beta.32 | `package.json` | Pre-release (`-beta.32`) | **Beta in production — see §8.3** |
| `drizzle-orm` | ^0.45.2 | `package.json` | _not verified — see §8.5_ | Currency not assessed |
| `plaid` | ^41.1.0 | `package.json` | _not verified — see §8.5_ | Currency not assessed |
| `@neondatabase/serverless` | ^1.1.0 | `package.json` | _not verified — see §8.5_ | Currency not assessed |
| `nodemailer` | 8.0.11 (transitive) | Pinned by `next-auth` | _not verified — see §8.5_ | **Open advisory — see patching policy EX-001** |

Only the Node.js row has been checked against a vendor-published schedule. The remaining rows record the version in the tree — which is verified — and leave the lifecycle cell explicitly unverified rather than asserting a support status this draft did not confirm. §8.5 closes that gap.

**Three findings are recorded above rather than resolved, because resolving them is a decision, not an edit:**

1. **CI built and tested on an end-of-life Node.js major from 2026-04-30 to 2026-08-21.** Node 20 reached end of life on the first date; CI moved to Node 22 on the second (PRs #162, #170). The 113-day exposure went undetected because no monitoring existed to detect it — the remediation closes the instance, and §4's quarterly review is what closes the class.
2. **The production runtime is not pinned in the repository.** `vercel.json` sets no runtime and `package.json` has no `engines` field, so the deployed Node version is whatever the Vercel project is configured to use. It may or may not match CI.
3. **The tracking issue and the tree agreed only after remediation.** GitHub issue #31 states "Node.js 22 LTS — supported until 2027-04". When this draft was written no Node 22 pin existed anywhere in the repository; as of 2026-08-21 CI is pinned to 22 (PRs #162, #170), so #31 now matches CI — but production remains unpinned (§8.2), so the issue still overstates what is verified.

## 4. Monitoring

**Current state: there is no automated EOL monitoring.** No scheduled check, no dashboard, no alert. The three findings in §3 were surfaced by a manual audit on 2026-08-20, not by a control.

The process this policy establishes:

- **Quarterly review** of every row in §3 against the vendor's published schedule, recorded with the date reviewed and the schedule consulted.
- **Runtime pin as the single source of truth.** The Node major is declared once in the repository and both CI and production read it, so the two cannot silently diverge (see §8.2 for the mechanism decision).
- **Dependency alerting** for versions that fall out of support, via the tooling described in `policies/vulnerability-scanning-policy.md`.

## 5. Upgrade Windows

| Trigger | Action | Window |
|---|---|---|
| Component enters its final 90 days of support | Upgrade planned and scheduled | Before EOL date |
| Component reaches EOL | Upgrade completed | 30 days |
| Component already past EOL at policy adoption | Remediation plan with a dated target | See §8.1 |
| Vendor announces an unscheduled deprecation | Assessed within 14 days | Per assessment |

An upgrade that cannot meet its window is recorded as an exception under `policies/vulnerability-patching-policy.md` §5, with the reason and a target date. An undocumented overrun is not permitted.

## 6. Runtime Version Discipline

- The Node major is pinned explicitly. An unpinned runtime silently follows the platform default and cannot be reasoned about.
- CI and production run the same major. Testing on a runtime the application does not deploy on does not evidence that the deployed runtime works.
- The pin is upgraded to an **active LTS** major, not to `latest`.

Vendor schedule, for reference at the next review:

| Node major | Enters maintenance | End of life |
|---|---|---|
| 20 (Iron) | 2024-10-22 | **2026-04-30** |
| 22 (Jod) | 2025-10-21 | 2027-04-30 |
| 24 (Krypton) | 2026-10-20 | 2028-04-30 |

## 7. Control Status (measured 2026-08-20)
Status values below: **Implemented** — verified present. **Partial** — present but narrower than the policy statement. **Not implemented** — verified absent. **Unverified** — cannot be measured from the repository and has not been confirmed elsewhere; it is not a synonym for absent, and it is not a synonym for fine.

| Control | Status | Basis |
|---|---|---|
| Component inventory maintained | **Implemented** (this document) | §3 |
| Vendor EOL dates tracked from vendor source | **Implemented** (this document) | §3, §6 |
| Automated EOL monitoring | **Not implemented** | No scheduled check exists in the repository or CI |
| Quarterly EOL review performed | **Not implemented** | No prior review recorded |
| Runtime pinned in repository | **Partial** | CI pins Node 20; production is unpinned |
| CI runtime within vendor support | **Not implemented** | Node 20 EOL 2026-04-30 |
| Upgrade windows defined | **Implemented** (this document) | §5 |

## 8. Open Decisions Required Before Submission

**8.1 — RESOLVED for CI 2026-08-21: Node 22.** CI and the scheduled security scan are pinned to 22 (PRs #162, #170), ending the 113-day past-EOL exposure. What remains of this decision is the production half, which is §8.2.

**8.2 — Decide how the runtime is pinned.** Options: `engines` in `package.json`, `.nvmrc`, the Vercel project setting, or a combination. Whichever is chosen, CI and production must read the same value. Confirm the current Vercel project Node setting — it is not visible from the repository.

**8.3 — Decide the position on `next-auth@5.0.0-beta.32`.** A pre-release handles authentication in production and has no vendor support commitment. It is also the package that pins the vulnerable `nodemailer` in `policies/vulnerability-patching-policy.md` §5. Either accept it as a documented exception with a review date, or plan the move to a stable release.

**8.4 — Assign the quarterly review.** §4 requires a named owner and a recurring date; neither exists today.

**8.5 — Verify the lifecycle status of the unverified components in §3.** Next.js, React, `drizzle-orm`, `plaid`, `@neondatabase/serverless` and `nodemailer` each need one check against the vendor's own published support policy. They are marked unverified rather than assumed current, because an EOL policy that asserts an unchecked support status is the failure it exists to prevent.

**8.6 — Correct GitHub issue #31.** Its stated stack does not match the repository. Leaving it uncorrected means the tracking record and the tree disagree.

## 9. Policy Review

This policy is reviewed annually, or when a tracked component changes major version.
