"use client"

import * as React from "react"
import {
    AudioWaveform,
    BookOpen,
    Bot,
    Command,
    Frame,
    GalleryVerticalEnd,
    Map,
    PieChart,
    Settings2,
    SquareTerminal,
    Grid3x3,
    UserCircle,
    Building2,
    Users,
    Plug,
    FileCheck,
    DollarSign,
    FileText,
} from "lucide-react"

import { NavMain } from "@/app/components/nav-main"
import { NavProjects } from "@/app/components/nav-projects"
import { NavUser } from "@/app/components/nav-user"
import { TeamSwitcher } from "@/app/components/team-switcher"
import { SidebarNotifications } from "@/app/components/sidebar-notifications"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar"
import { useRoleAccess } from "@/app/components/providers/role-access-provider"
import { useMemo } from "react"
import { useSession } from "next-auth/react"

import { type LucideIcon } from "lucide-react"

// Define the navigation item type
type NavItem = {
    title: string;
    url?: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
        title: string;
        url: string;
        pro?: boolean;
    }[];
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { userRole: userScopedRole, isLoading } = useRoleAccess();
    const { data: session } = useSession();
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    // Use null role during server-side rendering and first client render to ensure hydration match
    const safeUserRole = isMounted ? userScopedRole : null;

    const navItems = useMemo((): NavItem[] => {
        // Default URL fallbacks to avoid explicit casting issues if fields are optional
        const baseItems: NavItem[] = [
            {
                icon: Grid3x3,
                title: "Home",
                url: "/dashboard",
            },
            {
                icon: PieChart,
                title: "Statistics",
                url: "/dashboard/statistics",
            },
            {
                icon: UserCircle,
                title: "People Management",
                items: (() => {
                    const baseItems = [];

                    // Students - Visible to University level and above
                    if (
                        safeUserRole === "superadmin" ||
                        safeUserRole === "national" ||
                        safeUserRole === "region" ||
                        safeUserRole === "university"
                    ) {
                        baseItems.push({
                            title: "Students",
                            url: "/links/people/students",
                            pro: false,
                        });
                    }

                    // Graduates - Visible to Region level and above (plus graduate group leaders)
                    if (
                        safeUserRole === "superadmin" ||
                        safeUserRole === "national" ||
                        safeUserRole === "region" ||
                        safeUserRole === "graduatesmallgroup"
                    ) {
                        baseItems.push({
                            title: "Graduates",
                            url: "/links/people/graduates",
                            pro: false,
                        });
                    }

                    // Only add Bulk Import for specific roles
                    if (
                        safeUserRole === "superadmin" ||
                        safeUserRole === "region" ||
                        safeUserRole === "university"
                    ) {
                        baseItems.push({
                            title: "Bulk Import",
                            url: "/links/people/import",
                            pro: false,
                        });
                    }

                    return baseItems;
                })(),
            },
            // Only show Organization for users with specific roles
            ...(safeUserRole === "superadmin" ||
                safeUserRole === "national" || safeUserRole === "region" || safeUserRole === "university"
                ? [
                    {
                        icon: Building2,
                        title: "Organization",
                        items: (() => {
                            // Show different items based on user scope
                            if (safeUserRole === "superadmin" || safeUserRole === "national") {
                                return [
                                    {
                                        title: "Regions",
                                        url: "/links/organization/regions",
                                        pro: false,
                                    },
                                    {
                                        title: "Universities",
                                        url: "/links/organization/universities",
                                        pro: false,
                                    },
                                    {
                                        title: "Small Groups",
                                        url: "/links/organization/small-groups",
                                        pro: false,
                                    },
                                    {
                                        title: "Graduate Groups",
                                        url: "/links/organization/graduate-small-groups",
                                        pro: false,
                                    },
                                    {
                                        title: "Properties",
                                        url: "/links/organization/properties",
                                        pro: false,
                                    },
                                    {
                                        title: "General Information",
                                        url: "/links/organization/gbu-data",
                                        pro: false,
                                    },
                                ];
                            } else if (safeUserRole === "region") {
                                return [
                                    {
                                        title: "Universities",
                                        url: "/links/organization/universities",
                                        pro: false,
                                    },
                                    {
                                        title: "Small Groups",
                                        url: "/links/organization/small-groups",
                                        pro: false,
                                    },
                                    {
                                        title: "Graduate Groups",
                                        url: "/links/organization/graduate-small-groups",
                                        pro: false,
                                    },
                                    {
                                        title: "Properties",
                                        url: "/links/organization/properties",
                                        pro: false,
                                    },
                                    {
                                        title: "General Information",
                                        url: "/links/organization/gbu-data",
                                        pro: false,
                                    },
                                ];
                            }
                            else if (safeUserRole === "university") {
                                return [
                                    {
                                        title: "Small Groups",
                                        url: "/links/organization/small-groups",
                                        pro: false,
                                    },
                                ];
                            }

                            return [];
                        })(),
                    },
                ]
                : []),

            // Strategic Reporting - visible to staff and admins
            ...(safeUserRole === "superadmin" || safeUserRole === "national" || safeUserRole === "region" || safeUserRole === "university" || safeUserRole === "smallgroup" || safeUserRole === "graduatesmallgroup"
                ? [{
                    icon: FileText,
                    title: "Strategic Reporting",
                    items: (() => {
                        const baseItems = [];

                        // All roles can submit reports
                        baseItems.push({
                            title: "Submit Report",
                            url: "/reports",
                            pro: false,
                        });

                        // Show submitted reports to admins
                        if (safeUserRole === "superadmin" || safeUserRole === "national") {
                            baseItems.push({
                                title: "Submitted Reports",
                                url: "/links/admin/reports",
                                pro: false,
                            });
                        }

                        // Only superadmins can configure reporting structure
                        if (safeUserRole === "superadmin") {
                            baseItems.push({
                                title: "Configure Reports",
                                url: "/links/admin/reporting-config",
                                pro: false,
                            });
                        }

                        return baseItems;
                    })(),
                }]
                : []),

            ...(safeUserRole === "superadmin" || safeUserRole === "national" || safeUserRole === "region" || safeUserRole === "smallgroup" || safeUserRole === "university" || safeUserRole === "graduatesmallgroup"
                ? [{
                    icon: Plug,
                    title: "System Administration",
                    items: (() => {
                        const baseItems = [];

                        // Add User Management only for super admins
                        if (safeUserRole === "superadmin") {
                            baseItems.push({
                                title: "User Management",
                                url: "/links/admin/user-management",
                                pro: false,
                            });

                            // Public Invitations Management
                            baseItems.push({
                                title: "Invitations",
                                url: "/links/admin/invitations",
                                pro: false,
                            });
                        }
                        // Add Registrations (Member Reviews)
                        baseItems.push({
                            title: "Registrations",
                            url: "/links/admin/registrations",
                            pro: false,
                        });

                        // Financial Support - for national and superadmin only
                        if (safeUserRole === "superadmin" || safeUserRole === "national") {
                            baseItems.push({
                                title: "Financial Support",
                                url: "/links/admin/financial-support",
                                pro: false,
                            });
                        }


                        return baseItems;
                    })(),
                }]
                : []),
        ];

        return baseItems;
    }, [safeUserRole]);

    // Use session data for user profile
    const userData = {
        name: session?.user?.name || "User Name",
        email: session?.user?.email || "user@example.com",
        avatar: session?.user?.image || "/avatars/shadcn.jpg",
    };

    return (
        <Sidebar collapsible="icon" {...props} className="border-r border-border">
            <SidebarHeader>
                <SidebarNotifications />
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navItems} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={userData} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
