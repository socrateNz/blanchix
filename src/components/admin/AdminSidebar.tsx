"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  ShoppingBasket,
  CalendarClock,
  ScrollText,
  Truck,
  MapPin,
  Settings,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/shadcn/sidebar";
import Logo from "@/components/brand/Logo";

const LIENS = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/commandes", label: "Commandes", icon: ClipboardList },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/admin/catalogue", label: "Catalogue", icon: ShoppingBasket },
  { href: "/admin/creneaux", label: "Créneaux", icon: CalendarClock },
  { href: "/admin/livreurs", label: "Livreurs", icon: Truck },
  { href: "/admin/zones", label: "Zones de livraison", icon: MapPin },
  { href: "/admin/audit", label: "Audit", icon: ScrollText },
  { href: "/admin/reglages", label: "Réglages", icon: Settings },
] as const;

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <Link href="/admin" className="flex items-center px-1 group-data-[collapsible=icon]:justify-center">
          <span className="inline-block rounded-lg bg-white p-1 group-data-[collapsible=icon]:p-0.5">
            <Logo size="sm" />
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {LIENS.map((lien) => {
                const actif = lien.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(lien.href);
                return (
                  <SidebarMenuItem key={lien.href}>
                    <SidebarMenuButton asChild isActive={actif} tooltip={lien.label}>
                      <Link href={lien.href}>
                        <lien.icon />
                        <span>{lien.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
