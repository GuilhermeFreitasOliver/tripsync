import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  const body = (await request.json()) as { refreshToken?: string };

  if (!body.refreshToken) {
    return NextResponse.json({ message: "refreshToken ausente." }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set("refresh_token", body.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("refresh_token");
  return NextResponse.json({ ok: true });
}
