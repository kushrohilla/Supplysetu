"use client";

import { useRouter } from "next/navigation";
import { AUTH_COOKIE_NAME } from "@/services/session.constants";

export function Topbar() {
  const router = useRouter();

  const handleLogout = () => {
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
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
