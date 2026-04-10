// ── User ─────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Trip ─────────────────────────────────────
export interface Trip {
  id: string;
  title: string;
  description?: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  coverImageUrl?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── API ──────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
