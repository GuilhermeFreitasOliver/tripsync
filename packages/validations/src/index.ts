import { z } from "zod";

// ── User ─────────────────────────────────────
export const createUserSchema = z.object({
  email: z.string().email("E-mail inválido"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

// ── Trip ─────────────────────────────────────
export const createTripSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  destination: z.string().min(2, "Destino é obrigatório"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

// ── Inferred types ───────────────────────────
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTripInput = z.infer<typeof createTripSchema>;
