import type { User } from "@/types";

export interface LoginCredentials {
  username: string;
  password?: string;
  portal?: "ADMIN" | "CLINICAL";
}

export interface AuthSession {
  user: User;
  token: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

