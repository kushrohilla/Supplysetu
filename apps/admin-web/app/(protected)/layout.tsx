import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default function ProtectedLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute mode="protected">
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
