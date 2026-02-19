"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarNotifications } from "@/components/sidebar-notifications";
import { LogoutButton } from "@/components/logout-button";
import { useUserScope } from "@/hooks/use-user-scope";
import { Shield, Building2, MapPin, Users, GraduationCap, Church } from "lucide-react";

interface AppHeaderProps {
  breadcrumbs?: {
    label: string;
    href?: string;
    isLast?: boolean;
  }[];
}

export function AppHeader({ breadcrumbs = [] }: AppHeaderProps) {
  const { userScope, loading: isLoadingScope } = useUserScope();

  // Scope information mapping
  const getScopeInfo = (scope: string) => {
    switch (scope) {
      case 'superadmin':
        return { title: 'Super Admin', icon: Shield, color: 'text-red-600' };
      case 'national':
        return { title: 'National Level', icon: Building2, color: 'text-blue-600' };
      case 'region':
        return { title: userScope?.region?.name || 'Regional Level', icon: MapPin, color: 'text-green-600' };
      case 'university':
        return { title: userScope?.university?.name || 'University Level', icon: GraduationCap, color: 'text-purple-600' };
      case 'smallgroup':
        return { title: userScope?.smallGroup?.name || 'Small Group Level', icon: Users, color: 'text-orange-600' };
      case 'alumnismallgroup':
        return { title: userScope?.alumniGroup?.name || 'Alumni Group Level', icon: Church, color: 'text-indigo-600' };
      default:
        return { title: 'User', icon: Users, color: 'text-gray-600' };
    }
  };

  const scopeInfo = userScope ? getScopeInfo(userScope.scope) : { title: 'User', icon: Users, color: 'text-gray-600' };
  const ScopeIcon = scopeInfo.icon;

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                  {crumb.isLast ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href || "#"}>
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="ml-auto px-4 flex items-center gap-4">
        {/* Scope Indicator */}
        {!isLoadingScope && userScope && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-lg border border-border/20">
            <ScopeIcon className={`w-4 h-4 ${scopeInfo.color}`} />
            <span className="text-sm font-medium text-foreground">
              {scopeInfo.title}
            </span>
          </div>
        )}
        <SidebarNotifications />
        <LogoutButton />
      </div>
    </header>
  );
}
