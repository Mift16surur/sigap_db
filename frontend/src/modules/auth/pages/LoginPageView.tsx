"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { BrandBanner } from "../components/BrandBanner";
import { LoginForm } from "../components/LoginForm";
import type { AuthSession } from "../types/auth.types";

interface LoginPageViewProps {
  onLoginSuccess?: (session: AuthSession) => void;
}

export function LoginPageView({ onLoginSuccess }: LoginPageViewProps) {
  const router = useRouter();

  function handleSuccess(session: AuthSession) {
    if (onLoginSuccess) {
      onLoginSuccess(session);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white selection:bg-[#2563eb] selection:text-white">
      <BrandBanner />
      <LoginForm onSuccess={handleSuccess} />
    </div>
  );
}

