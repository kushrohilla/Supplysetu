"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppRoute } from "@/types/navigation";

const routes: AppRoute[] = [
  { href: "/review-orders", label: "Review Orders" },
  { href: "/packing", label: "Packing" },
  { href: "/dispatch", label: "Dispatch" },
  { href: "/delivery", label: "Delivery" },
  { href: "/payments", label: "Payments" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/retailer-invites", label: "Retailer Invites" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-200 bg-white p-4">
      <h2 className="mb-6 text-lg font-semibold text-slate-900">Distributor Admin</h2>
      <nav className="space-y-1">
        {routes.map((route) => {
          const isActive = pathname === route.href;
          return (
            <Link
              key={route.href}
              href={route.href}
              className={[
                "block rounded-md px-3 py-2 text-sm font-medium transition",
                isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
              ].join(" ")}
            >
              {route.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
