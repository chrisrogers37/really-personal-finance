import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-helpers";
import { updateUserProfile } from "@/lib/scd2";

export async function GET() {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
  });
}

export async function PUT(request: NextRequest) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const body = await request.json();
  const { name, email } = body;

  if (!name && !email) {
    return NextResponse.json(
      { error: "At least one field (name or email) must be provided" },
      { status: 400 }
    );
  }

  // Validate email format if provided
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Invalid email format" },
      { status: 400 }
    );
  }

  const updated = await updateUserProfile(session.user.id, {
    name: name ?? undefined,
    email: email ?? undefined,
  });

  return NextResponse.json({
    user: {
      id: updated.userId,
      email: updated.email,
      name: updated.name,
    },
  });
}
