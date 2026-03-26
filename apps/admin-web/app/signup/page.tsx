"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { getApiErrorMessage, registerDistributor } from "@/services/auth.service";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    distributor_name: "",
    owner_name: "",
    mobile_number: "",
    gst_number: "",
    full_address: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await registerDistributor({
        distributor_name: form.distributor_name.trim(),
        owner_name: form.owner_name.trim(),
        mobile_number: form.mobile_number.trim(),
        gst_number: form.gst_number.trim(),
        full_address: form.full_address.trim(),
        password: form.password,
      });

      setSuccessMessage("Account created successfully. Redirecting to login...");
      setTimeout(() => {
        router.replace("/login");
      }, 500);
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Signup failed. Please review the form and try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute mode="guest">
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow">
          <h1 className="text-xl font-semibold text-slate-900">Create Distributor Account</h1>
          <p className="mt-2 text-sm text-slate-600">
            Register your distributor workspace to access the admin operations panel.
          </p>

          {error ? (
            <div className="mt-4 rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div>
          ) : null}
          {successMessage ? (
            <div className="mt-4 rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          <form className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <label className="text-sm text-slate-700">
              Distributor Name
              <input
                value={form.distributor_name}
                onChange={(event) => updateField("distributor_name", event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                required
              />
            </label>

            <label className="text-sm text-slate-700">
              Owner Name
              <input
                value={form.owner_name}
                onChange={(event) => updateField("owner_name", event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                required
              />
            </label>

            <label className="text-sm text-slate-700">
              Mobile Number
              <input
                value={form.mobile_number}
                onChange={(event) => updateField("mobile_number", event.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                required
              />
            </label>

            <label className="text-sm text-slate-700">
              GST Number
              <input
                value={form.gst_number}
                onChange={(event) => updateField("gst_number", event.target.value.toUpperCase())}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                required
              />
            </label>

            <label className="text-sm text-slate-700 sm:col-span-2">
              Full Address
              <textarea
                value={form.full_address}
                onChange={(event) => updateField("full_address", event.target.value)}
                className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                required
              />
            </label>

            <label className="text-sm text-slate-700 sm:col-span-2">
              Password
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                autoComplete="new-password"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                required
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="sm:col-span-2 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-slate-900 hover:underline">
              Go to login
            </Link>
          </p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
