import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { NotificationsPage } from "@/components/notifications-page";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export default function Notifications() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader 
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "System Administration", href: "/links/admin" },
            { label: "Notifications", isLast: true }
          ]}
        />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <NotificationsPage />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
