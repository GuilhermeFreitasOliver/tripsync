import type { FastifyInstance } from "fastify";
import { authService, HttpError } from "../services/auth.service";

type RegisterBody = {
  name?: string;
  email?: string;
  password?: string;
};

type LoginBody = {
  email?: string;
  password?: string;
};

type RefreshBody = {
  refreshToken?: string;
};

function toErrorReply(error: unknown) {
  if (error instanceof HttpError) {
    return { statusCode: error.statusCode, message: error.message };
  }

  return { statusCode: 500, message: "Erro interno do servidor." };
}

async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: RegisterBody }>("/register", async (request, reply) => {
    try {
      const result = await authService.register(app, request.body, {
        userAgent: request.headers["user-agent"],
        ipAddress: request.ip,
      });

      return reply.code(201).send(result);
    } catch (error) {
      const parsed = toErrorReply(error);
      return reply.code(parsed.statusCode).send({ message: parsed.message });
    }
  });

  app.post<{ Body: LoginBody }>("/login", async (request, reply) => {
    try {
      const result = await authService.login(app, request.body, {
        userAgent: request.headers["user-agent"],
        ipAddress: request.ip,
      });

      return reply.send(result);
    } catch (error) {
      const parsed = toErrorReply(error);
      return reply.code(parsed.statusCode).send({ message: parsed.message });
    }
  });

  app.post<{ Body: RefreshBody }>("/refresh", async (request, reply) => {
    try {
      const result = await authService.refresh(app, request.body?.refreshToken);
      return reply.send(result);
    } catch (error) {
      const parsed = toErrorReply(error);
      return reply.code(parsed.statusCode).send({ message: parsed.message });
    }
  });

  app.post<{ Body: RefreshBody }>("/logout", async (request, reply) => {
    try {
      const result = await authService.logout(app, request.body?.refreshToken);
      return reply.send(result);
    } catch (error) {
      const parsed = toErrorReply(error);
      return reply.code(parsed.statusCode).send({ message: parsed.message });
    }
  });

  app.get("/google", async (_request, reply) => {
    try {
      const url = authService.getGoogleAuthUrl(app);
      return reply.redirect(url);
    } catch (error) {
      const parsed = toErrorReply(error);
      return reply.code(parsed.statusCode).send({ message: parsed.message });
    }
  });

  app.get<{ Querystring: { code?: string; state?: string } }>("/google/callback", async (request, reply) => {
    try {
      const result = await authService.googleCallback(app, request.query.code, request.query.state, {
        userAgent: request.headers["user-agent"],
        ipAddress: request.ip,
      });

      if ("redirectUrl" in result && typeof result.redirectUrl === "string") {
        return reply.redirect(result.redirectUrl);
      }

      return reply.send(result);
    } catch (error) {
      const parsed = toErrorReply(error);
      return reply.code(parsed.statusCode).send({ message: parsed.message });
    }
  });
}

export { authRoutes };
