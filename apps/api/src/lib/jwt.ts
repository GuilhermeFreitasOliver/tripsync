import process from "node:process";
import type { FastifyInstance } from "fastify";

export type AccessPayload = {
  sub: string;
  email: string;
  type: "access";
};

export type RefreshPayload = {
  sub: string;
  sid: string;
  type: "refresh";
};

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_EXPIRES_IN ?? "15m";
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_EXPIRES_IN ?? "30d";

export function signAccessToken(app: FastifyInstance, payload: Omit<AccessPayload, "type">) {
  return app.jwt.sign({ ...payload, type: "access" }, { expiresIn: ACCESS_TOKEN_TTL });
}

export function signRefreshToken(app: FastifyInstance, payload: Omit<RefreshPayload, "type">) {
  return app.jwt.sign({ ...payload, type: "refresh" }, { expiresIn: REFRESH_TOKEN_TTL });
}

export const tokenTtl = {
  access: ACCESS_TOKEN_TTL,
  refresh: REFRESH_TOKEN_TTL,
};
