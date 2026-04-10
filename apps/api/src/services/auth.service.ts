import bcrypt from "bcryptjs";
import process from "node:process";
import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { signAccessToken, signRefreshToken } from "../lib/jwt";

class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

type RegisterInput = {
  name?: string;
  email?: string;
  password?: string;
};

type LoginInput = {
  email?: string;
  password?: string;
};

type SessionMeta = {
  userAgent?: string;
  ipAddress?: string;
};

type PublicUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: Date;
};

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: Date;
}): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

function getFutureDate(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function createSessionTokens(app: FastifyInstance, user: { id: string; email: string }, meta: SessionMeta) {
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: "pending",
      expiresAt: getFutureDate(30),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    },
  });

  const accessToken = signAccessToken(app, { sub: user.id, email: user.email });
  const refreshToken = signRefreshToken(app, { sub: user.id, sid: session.id });
  const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

  await prisma.session.update({
    where: { id: session.id },
    data: { refreshTokenHash },
  });

  return { accessToken, refreshToken };
}

async function register(app: FastifyInstance, input: RegisterInput, meta: SessionMeta) {
  const { name, email, password } = input;

  if (!name || !email || !password) {
    throw new HttpError(400, "name, email e password sao obrigatorios.");
  }

  if (!isValidEmail(email)) {
    throw new HttpError(400, "Email invalido.");
  }

  if (password.length < 8) {
    throw new HttpError(400, "Password deve ter no minimo 8 caracteres.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new HttpError(409, "Email ja cadastrado.");
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hash,
    },
  });

  const tokens = await createSessionTokens(app, user, meta);
  return { ...tokens, user: toPublicUser(user) };
}

async function login(app: FastifyInstance, input: LoginInput, meta: SessionMeta) {
  const { email, password } = input;

  if (!email || !password) {
    throw new HttpError(400, "email e password sao obrigatorios.");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    throw new HttpError(401, "Credenciais invalidas.");
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new HttpError(401, "Credenciais invalidas.");
  }

  const tokens = await createSessionTokens(app, user, meta);
  return { ...tokens, user: toPublicUser(user) };
}

async function refresh(app: FastifyInstance, refreshToken?: string) {
  if (!refreshToken) {
    throw new HttpError(400, "refreshToken e obrigatorio.");
  }

  let payload: { sub: string; sid: string };

  try {
    const verified = await app.jwt.verify<{ sub?: string; sid?: string; type?: string }>(refreshToken);

    if (verified.type !== "refresh" || !verified.sid || !verified.sub) {
      throw new HttpError(401, "Refresh token invalido.");
    }

    payload = { sub: verified.sub, sid: verified.sid };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(401, "Refresh token invalido.");
  }

  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    include: { user: true },
  });

  if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt < new Date()) {
    throw new HttpError(401, "Sessao invalida.");
  }

  const matches = await bcrypt.compare(refreshToken, session.refreshTokenHash);
  if (!matches) {
    throw new HttpError(401, "Refresh token invalido.");
  }

  const accessToken = signAccessToken(app, { sub: session.user.id, email: session.user.email });
  const newRefreshToken = signRefreshToken(app, { sub: session.user.id, sid: session.id });
  const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 12);

  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: newRefreshTokenHash,
      expiresAt: getFutureDate(30),
    },
  });

  return { accessToken, refreshToken: newRefreshToken };
}

async function logout(app: FastifyInstance, refreshToken?: string) {
  if (!refreshToken) {
    throw new HttpError(400, "refreshToken e obrigatorio.");
  }

  try {
    const payload = await app.jwt.verify<{ sid?: string }>(refreshToken);

    if (payload.sid) {
      await prisma.session.updateMany({
        where: {
          id: payload.sid,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }
  } catch {
    // Logout idempotente.
  }

  return { ok: true };
}

function getGoogleAuthUrl(app: FastifyInstance) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!googleClientId || !googleRedirectUri) {
    throw new HttpError(503, "Google OAuth nao configurado.");
  }

  const state = app.jwt.sign({ type: "google_state" });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", googleClientId);
  url.searchParams.set("redirect_uri", googleRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  return url.toString();
}

async function googleCallback(app: FastifyInstance, code?: string, state?: string, meta?: SessionMeta) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!googleClientId || !googleClientSecret || !googleRedirectUri) {
    throw new HttpError(503, "Google OAuth nao configurado.");
  }

  if (!code || !state) {
    throw new HttpError(400, "Parametros de callback invalidos.");
  }

  try {
    const statePayload = await app.jwt.verify<{ type?: string }>(state);
    if (statePayload.type !== "google_state") {
      throw new HttpError(400, "State invalido.");
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(400, "State invalido.");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: googleClientId,
      client_secret: googleClientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: googleRedirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    throw new HttpError(401, "Falha ao autenticar com Google.");
  }

  const tokenData = (await tokenResponse.json()) as { access_token: string };

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  if (!profileResponse.ok) {
    throw new HttpError(401, "Falha ao obter perfil do Google.");
  }

  const profile = (await profileResponse.json()) as {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
  };

  if (!profile.email) {
    throw new HttpError(400, "Google nao retornou email.");
  }

  const email = profile.email;
  const fallbackName = email.split("@")[0] ?? "User";

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      name: profile.name ?? fallbackName,
      email,
      avatarUrl: profile.picture,
      password: null,
    },
    update: {
      name: profile.name ?? undefined,
      avatarUrl: profile.picture ?? undefined,
    },
  });

  await prisma.account.upsert({
    where: {
      provider_providerId: {
        provider: "google",
        providerId: profile.sub,
      },
    },
    create: {
      userId: user.id,
      provider: "google",
      providerId: profile.sub,
    },
    update: {
      userId: user.id,
    },
  });

  const tokens = await createSessionTokens(app, user, meta ?? {});

  const frontendRedirect = process.env.OAUTH_SUCCESS_REDIRECT_URL;
  if (frontendRedirect) {
    const redirectUrl = new URL(frontendRedirect);
    redirectUrl.searchParams.set("accessToken", tokens.accessToken);
    redirectUrl.searchParams.set("refreshToken", tokens.refreshToken);
    return { redirectUrl: redirectUrl.toString() };
  }

  return { ...tokens, user: toPublicUser(user) };
}

async function me(userId?: string) {
  if (!userId) {
    throw new HttpError(401, "Nao autorizado.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new HttpError(404, "Usuario nao encontrado.");
  }

  return user;
}

export const authService = {
  register,
  login,
  refresh,
  logout,
  getGoogleAuthUrl,
  googleCallback,
  me,
};

export { HttpError };
