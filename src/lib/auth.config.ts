import type { NextAuthConfig } from "next-auth";
import { updateUserProfile } from "@/lib/scd2";
import { db } from "@/db";
import { users, sessions, verificationTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Shared auth config used by both the full NextAuth instance (auth.ts)
 * and the lightweight middleware auth check (middleware.ts).
 *
 * IMPORTANT: This file must NOT import anything that depends on Node.js-only
 * modules (e.g. nodemailer via the Email provider) because middleware runs
 * in the Edge Runtime.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
    error: "/auth/error",
  },
  session: {
    strategy: "database",
  },
  providers: [], // Providers added in auth.ts (not safe for Edge Runtime)
  adapter: {
    async createUser(user) {
      const businessId = crypto.randomUUID();
      const [created] = await db
        .insert(users)
        .values({
          userId: businessId,
          email: user.email!,
          name: user.name ?? null,
          emailVerified: user.emailVerified ?? null,
          isCurrent: true,
          validFrom: new Date(),
        })
        .returning();
      return {
        id: created.userId,
        email: created.email,
        name: created.name,
        emailVerified: created.emailVerified,
      };
    },

    async getUser(id) {
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.userId, id), eq(users.isCurrent, true)))
        .limit(1);
      if (!user) return null;
      return {
        id: user.userId,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      };
    },

    async getUserByEmail(email) {
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.isCurrent, true)))
        .limit(1);
      if (!user) return null;
      return {
        id: user.userId,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      };
    },

    async getUserByAccount({ providerAccountId, provider }) {
      // Not used for email provider, but required by adapter interface
      void providerAccountId;
      void provider;
      return null;
    },

    async updateUser(user) {
      if (!user.id) throw new Error("User ID required");

      const updated = await updateUserProfile(user.id, {
        name: user.name ?? undefined,
        email: user.email ?? undefined,
        emailVerified: user.emailVerified,
      });

      return {
        id: updated.userId,
        email: updated.email,
        name: updated.name,
        emailVerified: updated.emailVerified,
      };
    },

    async deleteUser(userId) {
      await db
        .update(users)
        .set({ validTo: new Date(), isCurrent: false })
        .where(eq(users.userId, userId));
    },

    async linkAccount() {
      return undefined;
    },

    async unlinkAccount() {
      return undefined;
    },

    async createSession(session) {
      const [created] = await db
        .insert(sessions)
        .values({
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: session.expires,
        })
        .returning();
      return {
        sessionToken: created.sessionToken,
        userId: created.userId,
        expires: created.expires,
      };
    },

    async getSessionAndUser(sessionToken) {
      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, sessionToken))
        .limit(1);
      if (!session) return null;

      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.userId, session.userId), eq(users.isCurrent, true)))
        .limit(1);
      if (!user) return null;

      return {
        session: {
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: session.expires,
        },
        user: {
          id: user.userId,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        },
      };
    },

    async updateSession(session) {
      const [updated] = await db
        .update(sessions)
        .set({
          expires: session.expires,
          userId: session.userId,
        })
        .where(eq(sessions.sessionToken, session.sessionToken))
        .returning();
      if (!updated) return null;
      return {
        sessionToken: updated.sessionToken,
        userId: updated.userId,
        expires: updated.expires,
      };
    },

    async deleteSession(sessionToken) {
      await db
        .delete(sessions)
        .where(eq(sessions.sessionToken, sessionToken));
    },

    async createVerificationToken(token) {
      const [created] = await db
        .insert(verificationTokens)
        .values({
          identifier: token.identifier,
          token: token.token,
          expires: token.expires,
        })
        .returning();
      return created;
    },

    async useVerificationToken({ identifier, token }) {
      const [found] = await db
        .select()
        .from(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, identifier),
            eq(verificationTokens.token, token)
          )
        )
        .limit(1);
      if (!found) return null;

      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.token, token));

      return found;
    },
  },
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
};
