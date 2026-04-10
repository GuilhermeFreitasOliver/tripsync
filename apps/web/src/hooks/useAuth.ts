"use client";

import { create } from "zustand";
import { api, setApiAccessToken } from "@/lib/api";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  createdAt?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
};

async function persistRefreshToken(refreshToken: string) {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error("Falha ao salvar sessao.");
  }
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (input) => {
    set({ isLoading: true });

    try {
      const { data } = await api.post("/api/v1/auth/login", input);
      await persistRefreshToken(data.refreshToken);

      setApiAccessToken(data.accessToken);
      set({
        accessToken: data.accessToken,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setApiAccessToken(null);
      set({ accessToken: null, user: null, isAuthenticated: false, isLoading: false });
      throw error;
    }
  },

  register: async (input) => {
    set({ isLoading: true });

    try {
      const { data } = await api.post("/api/v1/auth/register", input);
      await persistRefreshToken(data.refreshToken);

      setApiAccessToken(data.accessToken);
      set({
        accessToken: data.accessToken,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setApiAccessToken(null);
      set({ accessToken: null, user: null, isAuthenticated: false, isLoading: false });
      throw error;
    }
  },

  refreshSession: async () => {
    set({ isLoading: true });

    try {
      const refreshResponse = await fetch("/api/auth/refresh", { method: "POST" });
      if (!refreshResponse.ok) {
        throw new Error("Sessao expirada.");
      }

      const refreshData = (await refreshResponse.json()) as { accessToken: string };
      setApiAccessToken(refreshData.accessToken);

      const { data: user } = await api.get<AuthUser>("/api/v1/me");

      set({
        accessToken: refreshData.accessToken,
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      setApiAccessToken(null);
      set({
        accessToken: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setApiAccessToken(null);
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));
