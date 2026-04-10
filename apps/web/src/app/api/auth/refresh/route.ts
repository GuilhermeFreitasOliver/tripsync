import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  try {
    const upstream = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!upstream.ok) {
      cookieStore.delete("refresh_token");
      return NextResponse.json({ message: "Sessao invalida." }, { status: 401 });
    }

    const data = (await upstream.json()) as { accessToken: string; refreshToken: string };

    cookieStore.set("refresh_token", data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: THIRTY_DAYS,
    });

    return NextResponse.json({ accessToken: data.accessToken });
  } catch (error) {
    console.error("[Refresh Session Error]", error);
    return NextResponse.json({ message: "Falha de comunicacao com a API." }, { status: 502 });
  }
}
