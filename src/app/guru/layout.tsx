import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { GuruSidebar } from "@/components/guru/app-sidebar";
import { SiteHeader } from "@/components/admin/site-header";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";

export default async function GuruLayout({ children }: LayoutProps<"/guru">) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "Guru") {
    redirect("/");
  }

  return (
    <SidebarProvider>
      <GuruSidebar />
      <SidebarInset>
        <SiteHeader user={session.user} />
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}