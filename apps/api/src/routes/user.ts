import type { FastifyInstance } from "fastify";
import { authService, HttpError } from "../services/auth.service";

function toErrorReply(error: unknown) {
  if (error instanceof HttpError) {
    return { statusCode: error.statusCode, message: error.message };
  }

  return { statusCode: 500, message: "Erro interno do servidor." };
}

async function userRoutes(app: FastifyInstance) {
  app.get("/me", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const result = await authService.me(request.user.sub);
      return reply.send(result);
    } catch (error) {
      const parsed = toErrorReply(error);
      return reply.code(parsed.statusCode).send({ message: parsed.message });
    }
  });
}

export { userRoutes };
