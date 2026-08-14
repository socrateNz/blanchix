import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { estRoleAdmin } from "@/lib/roles";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/shadcn/sidebar";
import { Separator } from "@/components/shadcn/separator";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminUserMenu from "@/components/admin/AdminUserMenu";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user || !estRoleAdmin(user.role)) {
    redirect("/admin/connexion");
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-marine/12 bg-white px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-5" />
            <span className="font-display text-sm font-bold text-marine">Blanchix Admin</span>
          </div>
          <AdminUserMenu nom={user.name ?? "?"} role={user.role} />
        </header>
        <main className="flex-1 bg-brume p-6 sm:p-8">
          <div className="mx-auto">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
