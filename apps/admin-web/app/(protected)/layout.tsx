import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { isAuthenticated } from "@/services/auth.service";
import { isTenantOnboardingComplete } from "@/services/onboarding.service";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
  if (!(await isTenantOnboardingComplete())) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
