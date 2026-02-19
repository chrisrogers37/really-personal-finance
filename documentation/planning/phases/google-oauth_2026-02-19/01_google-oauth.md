# Phase 01: Add Google OAuth Sign-In

**PR Title:** feat: add Google OAuth as alternative sign-in method
**Status:** :white_check_mark: COMPLETE
**Started:** 2026-02-19
**Completed:** 2026-02-19
**PR:** #19
**Risk:** Low
**Effort:** Low (4 files modified, ~60 lines changed)

## 1. Context

The app uses email magic links as the only auth method. Every login requires an email round-trip — enter email, wait for delivery, switch to inbox, click link, redirect back. This is 5+ steps with a context switch.

Google OAuth reduces this to: click "Sign in with Google" → select Google account → done. One click for returning users with an active Google session.

The `authAccounts` table and adapter stubs already exist in the codebase — they just need to be wired up.

## 2. Dependencies

None. This is a standalone enhancement.

## 3. Files Modified

| File | Action |
|------|--------|
| `src/lib/auth.config.ts` | Implement 3 adapter methods (linkAccount, getUserByAccount, unlinkAccount) |
| `src/lib/auth.ts` | Add Google provider |
| `src/app/auth/signin/page.tsx` | Add Google sign-in button with divider |
| `.env.example` | Add Google OAuth env vars |

**Files NOT modified:**
- `src/middleware.ts` — No changes needed. Middleware checks database sessions via the adapter, not provider configuration. Google OAuth creates the same database sessions as email.
- `src/db/schema.ts` — `authAccounts` table already has the correct columns. A unique constraint on `(provider, provider_account_id)` would be ideal but is not required for correctness (NextAuth handles deduplication via `getUserByAccount`).

## 4. Detailed Implementation

### Step 1: Implement adapter methods in `src/lib/auth.config.ts`

Three adapter methods are currently stubs. They need real implementations to support OAuth account linking.

**Add import** — `authAccounts` from schema (line 4):

```ts
// BEFORE (line 4):
import { users, sessions, verificationTokens } from "@/db/schema";

// AFTER:
import { users, sessions, verificationTokens, authAccounts } from "@/db/schema";
```

**Replace `getUserByAccount`** (lines 77–82):

```ts
// BEFORE:
async getUserByAccount({ providerAccountId, provider }) {
  // Not used for email provider, but required by adapter interface
  void providerAccountId;
  void provider;
  return null;
},

// AFTER:
async getUserByAccount({ providerAccountId, provider }) {
  const [account] = await db
    .select()
    .from(authAccounts)
    .where(
      and(
        eq(authAccounts.provider, provider),
        eq(authAccounts.providerAccountId, providerAccountId)
      )
    )
    .limit(1);
  if (!account) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.userId, account.userId), eq(users.isCurrent, true)))
    .limit(1);
  if (!user) return null;

  return {
    id: user.userId,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
  };
},
```

**Replace `linkAccount`** (lines 108–110):

```ts
// BEFORE:
async linkAccount() {
  return undefined;
},

// AFTER:
async linkAccount(account) {
  await db.insert(authAccounts).values({
    userId: account.userId,
    type: account.type,
    provider: account.provider,
    providerAccountId: account.providerAccountId,
    refreshToken: account.refresh_token ?? null,
    accessToken: account.access_token ?? null,
    expiresAt: account.expires_at
      ? new Date(account.expires_at * 1000)
      : null,
    tokenType: account.token_type ?? null,
    scope: account.scope ?? null,
    idToken: account.id_token ?? null,
    sessionState: account.session_state ?? null,
  });
  return undefined;
},
```

**Note on `expiresAt` conversion:** NextAuth passes `expires_at` as a Unix timestamp (seconds). The Drizzle schema stores it as `timestamp("expires_at", { mode: "date" })`. Multiply by 1000 to convert to milliseconds for the `Date` constructor.

**Replace `unlinkAccount`** (lines 112–114):

```ts
// BEFORE:
async unlinkAccount() {
  return undefined;
},

// AFTER:
async unlinkAccount({ provider, providerAccountId }) {
  await db
    .delete(authAccounts)
    .where(
      and(
        eq(authAccounts.provider, provider),
        eq(authAccounts.providerAccountId, providerAccountId)
      )
    );
},
```

### Step 2: Add Google provider in `src/lib/auth.ts`

```ts
// BEFORE:
import NextAuth from "next-auth";
import Email from "next-auth/providers/email";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Email({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  ],
});

// AFTER:
import NextAuth from "next-auth";
import Email from "next-auth/providers/email";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Email({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  ],
});
```

**Why `allowDangerousEmailAccountLinking: true`:** Without this flag, a user who previously signed in via email magic link cannot sign in with Google using the same email — NextAuth throws an "account already exists" error. This flag allows linking when the OAuth provider verifies email ownership. Google always verifies emails, so this is safe. The alternative (users locked into one method) is worse UX.

**Why Google is listed before Email:** Provider order affects the default sign-in page layout. Listing Google first makes it visually prominent.

### Step 3: Update sign-in page UI (`src/app/auth/signin/page.tsx`)

Add a "Sign in with Google" button above the email form, separated by a visual divider.

```tsx
// BEFORE (full form section, lines 38-83):
// The return statement with just the email form

// AFTER (full return for the sign-in state):
return (
  <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_70%)]" />
    <div className="max-w-md w-full p-8 mx-4 bg-background-card-auth backdrop-blur-2xl rounded-2xl border border-border shadow-2xl relative animate-scale-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Really <span className="text-indigo-400">Personal</span> Finance</h1>
        <p className="text-foreground-muted mt-2">
          Sign in or create an account to get started
        </p>
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={() => { setLoading(true); signIn("google", { callbackUrl: "/dashboard" }); }}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-2 px-4 border border-border rounded-xl bg-background hover:bg-white/5 text-foreground font-medium transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Sign in with Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-foreground-tertiary">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Email form (unchanged) */}
      <form onSubmit={handleSubmit} className="space-y-4">
        ...existing form content unchanged...
      </form>

      <p className="text-xs text-foreground-tertiary text-center mt-6">
        By signing in, you agree that your bank transactions will be stored
        securely in our database to provide spending insights.
      </p>
    </div>
  </div>
);
```

**Key decisions:**
- Google button uses a border-style variant (not filled) to distinguish from the primary email CTA
- Inline SVG for the Google "G" logo — no external dependency or image fetch
- `callbackUrl: "/dashboard"` sends users straight to the dashboard after Google auth
- Button shares the same `disabled` state as the email form to prevent double-submits
- `active:scale-95` matches the press feedback pattern from Phase 07

### Step 4: Update `.env.example`

Add Google OAuth credentials after the existing NextAuth section:

```
# BEFORE (lines 4-8):
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-random-secret-here
EMAIL_SERVER=smtp://user:password@smtp.example.com:587
EMAIL_FROM=noreply@example.com

# AFTER:
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-random-secret-here
EMAIL_SERVER=smtp://user:password@smtp.example.com:587
EMAIL_FROM=noreply@example.com

# Google OAuth (https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 5. Google Cloud Console Setup (Manual — Not Automated)

The developer must create OAuth credentials in Google Cloud Console before this works:

1. Go to https://console.cloud.google.com/apis/credentials
2. Create a new OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://<your-domain>/api/auth/callback/google`
   - For local dev: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID and Client Secret into `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
5. Add both vars to Vercel environment settings for production

## 6. Account Linking Behavior

| Scenario | What Happens |
|----------|-------------|
| New user signs in with Google | `createUser` → `linkAccount` → `createSession` |
| Returning Google user signs in | `getUserByAccount` → `createSession` |
| Existing email user signs in with Google (same email) | `getUserByEmail` → `linkAccount` → `createSession` |
| User with Google linked signs in with email magic link | `getUserByEmail` → normal email flow |
| User signs in with Google using a different email | New user created (separate account) |

`allowDangerousEmailAccountLinking` enables row 3. Without it, that scenario errors.

## 7. Test Plan

### Automated
- **Build passes:** `npm run build` completes without errors
- **Existing tests pass:** All 34 unit tests continue to pass
- **New unit test:** Test `getUserByAccount` adapter method returns correct user when account exists, returns null when it doesn't
- **New unit test:** Test `linkAccount` adapter method inserts a row into `authAccounts`

### Manual Verification
1. Navigate to `/auth/signin` — Google button appears above the email form with an "or" divider
2. Click "Sign in with Google" — redirects to Google OAuth consent screen
3. Complete Google sign-in — redirected to `/dashboard` with a valid session
4. Sign out, sign in again with Google — works without re-entering credentials (if Google session is active)
5. Sign in with email magic link using the same email — still works
6. Verify `auth_accounts` table has a row with `provider = 'google'`
7. Test on mobile viewport — button and divider layout holds

### Accessibility
- Google button is keyboard-focusable and has visible focus ring
- Button text is descriptive ("Sign in with Google")
- SVG has no alt text needed (decorative, text label provides context)
- Color contrast meets WCAG AA

## 8. Verification Checklist

- [ ] `npm run build` passes
- [ ] All existing tests pass (34/34)
- [ ] New adapter tests pass
- [ ] Google button appears on sign-in page
- [ ] Google OAuth flow works end-to-end (requires real credentials)
- [ ] Existing email magic link flow still works
- [ ] Account linking works (email user → Google sign-in with same email)
- [ ] Mobile layout verified
- [ ] `.env.example` updated with Google vars
- [ ] No TypeScript errors (`npx tsc --noEmit`)

## 9. What NOT To Do

- **Do NOT add Google provider to `auth.config.ts`.** That file is the edge-safe config for middleware. While Google provider is technically edge-safe, there's no benefit — middleware only checks session existence via the database adapter, not provider configuration. Keep providers in `auth.ts` only.
- **Do NOT remove `allowDangerousEmailAccountLinking`.** Without it, existing email users get an error when trying Google sign-in. The name is misleading — it's safe when the OAuth provider verifies emails (Google always does).
- **Do NOT add a migration for a unique constraint on `authAccounts`.** The `getUserByAccount` lookup handles deduplication. Adding a constraint is fine as a future improvement but adds unnecessary scope to this PR.
- **Do NOT use an external image/CDN for the Google logo.** Inline SVG avoids network requests and works offline. The Google "G" SVG is well-established and does not change.
- **Do NOT change the middleware or auth.config.ts providers array.** The `providers: []` in auth.config.ts is correct and intentional.
