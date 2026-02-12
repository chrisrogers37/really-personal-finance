import NextAuth from "next-auth";
import Email from "next-auth/providers/email";
import { db } from "@/db";
import { users, sessions, verificationTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Email({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
    error: "/auth/error",
  },
  session: {
    strategy: "database",
  },
  adapter: {
    async createUser(user) {
      const businessId = randomUUID();
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
      // SCD2: close current row and insert new version
      const [current] = await db
        .select()
        .from(users)
        .where(and(eq(users.userId, user.id), eq(users.isCurrent, true)))
        .limit(1);

      if (!current) throw new Error("User not found");

      const now = new Date();

      // Close current row
      await db
        .update(users)
        .set({ validTo: now, isCurrent: false })
        .where(eq(users.id, current.id));

      // Insert new version
      const [updated] = await db
        .insert(users)
        .values({
          userId: current.userId,
          email: user.email ?? current.email,
          name: user.name ?? current.name,
          emailVerified:
            user.emailVerified !== undefined
              ? user.emailVerified
              : current.emailVerified,
          validFrom: now,
          isCurrent: true,
        })
        .returning();

      return {
        id: updated.userId,
        email: updated.email,
        name: updated.name,
        emailVerified: updated.emailVerified,
      };
    },

    async deleteUser(userId) {
      // Mark all versions as not current
      await db
        .update(users)
        .set({ validTo: new Date(), isCurrent: false })
        .where(eq(users.userId, userId));
    },

    async linkAccount() {
      // Not used for email-only auth
      return undefined;
    },

    async unlinkAccount() {
      // Not used for email-only auth
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
});
