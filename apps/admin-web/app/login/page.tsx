"use client";

import { useRouter } from "next/navigation";
import { AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE } from "@/services/session.constants";

const AUTH_COOKIE = `${AUTH_COOKIE_NAME}=${AUTH_COOKIE_VALUE}; path=/`;

export default function LoginPage() {
  const router = useRouter();

  const handleMockLogin = () => {
    document.cookie = AUTH_COOKIE;
    router.replace("/review-orders");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow">
        <h1 className="text-xl font-semibold text-slate-900">Distributor Admin Login</h1>
        <p className="mt-2 text-sm text-slate-600">
          Placeholder login screen for upcoming authentication integration.
        </p>
        <button
          type="button"
          onClick={handleMockLogin}
          className="mt-6 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Mock Login
        </button>
      </div>
    </div>
  );
}
