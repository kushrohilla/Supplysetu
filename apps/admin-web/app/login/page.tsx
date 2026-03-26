"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { getApiErrorMessage, loginDistributor } from "@/services/auth.service";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await loginDistributor({
        identifier: identifier.trim(),
        password,
      });
      router.replace("/review-orders");
      router.refresh();
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Login failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute mode="guest">
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow">
          <h1 className="text-xl font-semibold text-slate-900">Distributor Admin Login</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in with your distributor name, mobile number, or username.
          </p>

          {error ? (
            <div className="mt-4 rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm text-slate-700">
              Distributor Name / Mobile
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="username"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                placeholder="Enter distributor name or mobile"
                required
              />
            </label>

            <label className="block text-sm text-slate-700">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                placeholder="Enter password"
                required
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Signing in..." : "Login"}
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-600">
            Need an account?{" "}
            <Link href="/signup" className="font-medium text-slate-900 hover:underline">
              Create distributor account
            </Link>
          </p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
