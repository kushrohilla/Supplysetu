"use client";

import { useRouter } from "next/navigation";
import { clearAuthSession } from "@/services/auth.service";

export function Topbar() {
  const router = useRouter();

  const handleLogout = () => {
    clearAuthSession();
    router.replace("/login");
    router.refresh();
  };

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <p className="text-sm text-slate-600">Distributor workflow operations</p>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
      >
        Logout
      </button>
    </header>
  );
}
