"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { clearRetailerSession, getStoredRetailerSession } from "@/services/auth.service";
import { RETAILER_CART_STORAGE_KEY } from "@/services/session.constants";

type AppShellProps = {
  itemCount: number;
  children: React.ReactNode;
};

const navItems = [
  { href: "/catalogue", label: "Catalogue" },
  { href: "/cart", label: "Cart" },
  { href: "/orders", label: "Orders" },
];

export function AppShell({ itemCount, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const session = getStoredRetailerSession();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Retailer App</p>
            <h1 className="text-lg font-semibold text-slate-900">
              {session?.distributor?.name ?? "Select distributor"}
            </h1>
          </div>
          <nav className="flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const label = item.href === "/cart" ? `${item.label} (${itemCount})` : item.label;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            <button
              type="button"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              onClick={() => {
                clearRetailerSession();
                if (typeof window !== "undefined") {
                  window.localStorage.removeItem(RETAILER_CART_STORAGE_KEY);
                }
                router.replace("/login");
              }}
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
