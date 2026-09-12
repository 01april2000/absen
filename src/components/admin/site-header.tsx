"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { LogOut, UserRound } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

type SiteHeaderProps = {
  user: {
    name: string;
    email: string;
    role: string;
  };
};

export function SiteHeader({ user }: SiteHeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5!" />
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden items-center gap-2 text-sm sm:flex">
          <span className="hidden font-medium md:inline">{user.name}</span>
          <span className="hidden text-muted-foreground md:inline">{user.email}</span>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" className="rounded-full border">
          <UserRound />
          <span className="sr-only">Avatar</span>
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={handleLogout}>
          <LogOut />
          <span className="sr-only">Keluar</span>
        </Button>
      </div>
    </header>
  );
}