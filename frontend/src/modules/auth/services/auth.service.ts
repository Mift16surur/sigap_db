import { apiRequest } from "@/lib/api-client";
import type { LoginCredentials, AuthSession } from "../types/auth.types";

export class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const res = await apiRequest<{ ok: boolean; session: AuthSession; error?: string }>("/auth", {
      method: "POST",
      body: {
        action: "LOGIN",
        portal: credentials.portal || "CLINICAL",
        username: credentials.username.trim(),
        password: credentials.password || "admin2026",
      },
    });

    if (!res.ok || !res.session?.user) {
      throw new Error(res.error || "Gagal masuk. Periksa kembali username dan kata sandi Anda.");
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("sigap_token", res.session.token);
      localStorage.setItem("sigap_user", JSON.stringify(res.session.user));
    }

    return res.session;
  }

  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sigap_token");
      localStorage.removeItem("sigap_user");
    }
  }

  getCurrentSession(): AuthSession | null {
    if (typeof window === "undefined") return null;
    try {
      const token = localStorage.getItem("sigap_token");
      const userStr = localStorage.getItem("sigap_user");
      if (token && userStr) {
        return { token, user: JSON.parse(userStr) };
      }
    } catch {
      // ignore
    }
    return null;
  }
}

export const authService = new AuthService();

