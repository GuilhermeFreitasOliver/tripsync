import "dotenv/config";
import process from "node:process";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { authPlugin } from "./plugins/auth";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/user";

const server = Fastify({ logger: true });

void server.register(cors, {
  origin: true, // Permite qualquer origin exata (suporta credentials)
  credentials: true, // Necessário para aceitar cookies HttpOnly
});
void server.register(helmet);
void server.register(authPlugin);
void server.register(authRoutes, { prefix: "/api/v1/auth" });
void server.register(userRoutes, { prefix: "/api/v1" });

server.get("/health", async () => {
  return { ok: true };
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    await server.listen({ port, host: "0.0.0.0" });
    server.log.info(`Server listening on port ${port}`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

void start();
