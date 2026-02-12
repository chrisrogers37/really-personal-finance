import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateUserProfile, getUserHistory } from "@/lib/scd2";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
  });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

export async function GET_HISTORY() {
  // Exposed at /api/profile/history
  return null;
}
