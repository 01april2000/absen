"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartPie,
  GraduationCap,
  LayoutDashboard,
  NotebookPen,
  Users,
  BookOpenText,
  School,
  Cpu,
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
  SidebarRail,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Data Guru",
    href: "/admin/guru",
    icon: GraduationCap,
  },
  {
    title: "Data Siswa",
    href: "/admin/siswa",
    icon: Users,
  },
  {
    title: "Mata Pelajaran",
    href: "/admin/mapel",
    icon: BookOpenText,
  },
  {
    title: "Kelas",
    href: "/admin/kelas",
    icon: School,
  },
  {
    title: "Jadwal",
    href: "/admin/jadwal",
    icon: CalendarDays,
  },
  {
    title: "Titip Tugas",
    href: "/admin/titip-tugas",
    icon: NotebookPen,
  },
  {
    title: "Device",
    href: "/admin/device",
    icon: Cpu,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/admin" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ChartPie />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-heading font-semibold">Aplikasi Absen</span>
                <span className="text-xs text-muted-foreground">Admin Panel</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}