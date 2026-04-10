import process from "node:process";
import fp from "fastify-plugin";
import jwt from "@fastify/jwt";

const authPlugin = fp(async (app) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET deve estar definido.");
  }

  await app.register(jwt, { secret });

  app.decorate("authenticate", async (request, reply) => {
    try {
      await request.jwtVerify();
      if (request.user.type !== "access") {
        return reply.code(401).send({ message: "Token de acesso invalido." });
      }
    } catch {
      return reply.code(401).send({ message: "Nao autorizado." });
    }
  });
});

export { authPlugin };
