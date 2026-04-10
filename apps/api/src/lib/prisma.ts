import process from "node:process";
import { PrismaClient } from "../../generated/prisma/client";

// Singleton: garante uma unica instancia do PrismaClient na aplicacao
const accelerateUrl = process.env.PRISMA_ACCELERATE_URL ?? process.env.DATABASE_URL;

if (!accelerateUrl) {
  throw new Error("PRISMA_ACCELERATE_URL ou DATABASE_URL deve estar definido.");
}

const prisma = new PrismaClient({
  accelerateUrl,
  log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
});

export { prisma };
