"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { getApiErrorMessage, requestOtp, verifyOtp } from "@/services/auth.service";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpHint, setOtpHint] = useState<string | null>(null);

  return (
    <ProtectedRoute mode="guest">
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Retailer Login</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Quick ordering access</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in with your mobile number, choose your distributor, and start placing real orders.
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setLoading(true);
              setError(null);

              try {
                if (step === "phone") {
                  const response = await requestOtp(phone);
                  setOtpHint(response.otp ? `Use OTP ${response.otp} in this environment.` : null);
                  setStep("otp");
                } else {
                  await verifyOtp(phone, otp);
                  router.push("/select-distributor");
                }
              } catch (submissionError) {
                setError(
                  getApiErrorMessage(
                    submissionError,
                    step === "phone" ? "Unable to request OTP." : "Unable to verify OTP.",
                  ),
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Mobile number</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-900"
                placeholder="9999999999"
                inputMode="numeric"
                maxLength={10}
              />
            </label>

            {step === "otp" ? (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">OTP</span>
                <input
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-900"
                  placeholder="1234"
                  inputMode="numeric"
                  maxLength={6}
                />
              </label>
            ) : null}

            {otpHint ? <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{otpHint}</p> : null}
            {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

            <button
              type="submit"
              disabled={loading || phone.length !== 10 || (step === "otp" && otp.length < 4)}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "Please wait..." : step === "phone" ? "Send OTP" : "Verify and continue"}
            </button>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
