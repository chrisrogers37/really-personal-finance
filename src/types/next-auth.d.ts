import type { UserRole } from "@/lib/rbac";
import "next-auth";

declare module "next-auth" {
  interface User {
    role?: UserRole;
    mfaEnabled?: boolean;
  }

  interface Session {
    user: User & {
      id: string;
      email: string;
      name?: string | null;
      role?: UserRole;
      mfaEnabled?: boolean;
    };
  }
}
