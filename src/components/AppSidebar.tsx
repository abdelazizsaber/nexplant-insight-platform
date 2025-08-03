
import { Building2, Users, Monitor, Settings, BarChart3, LogOut, Home, Gauge } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface User {
  username: string;
  role: string;
  company_id: number | null;
}

interface AppSidebarProps {
  user: User;
  currentView: string;
  setCurrentView: (view: string) => void;
}

export function AppSidebar({ user, currentView, setCurrentView }: AppSidebarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local storage and redirect regardless of API call result
      localStorage.removeItem("user");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate("/login");
    }
  };

  const getMenuItems = () => {
    const baseItems = [
      {
        title: "Dashboard",
        icon: BarChart3,
        id: "dashboard"
      }
    ];

    if (user.role === "global_admin") {
      return [
        ...baseItems,
        {
          title: "Companies",
          icon: Building2,
          id: "companies"
        },
        {
          title: "All Users",
          icon: Users,
          id: "all-users"
        },
        {
          title: "All Devices",
          icon: Monitor,
          id: "all-devices"
        }
      ];
    }

    if (user.role === "company_admin") {
      return [
        ...baseItems,
        {
          title: "Production dashboards",
          icon: Gauge,
          id: "production-dashboards"
        },
        {
          title: "Production",
          icon: Settings,
          id: "production"
        },
        {
          title: "Machines",
          icon: Settings,
          id: "machines"
        },
        {
          title: "Devices",
          icon: Monitor,
          id: "devices"
        },
        {
          title: "Users",
          icon: Users,
          id: "users"
        }
      ];
    }

    // Regular user (view_only_user)
    return [
      ...baseItems,
      {
        title: "Production dashboards",
        icon: Gauge,
        id: "production-dashboards"
      },
      {
        title: "Production",
        icon: Settings,
        id: "production"
      },
      {
        title: "Machines",
        icon: Settings,
        id: "machines"
      },
      {
        title: "Devices",
        icon: Monitor,
        id: "devices"
      }
    ];
  };

  const menuItems = getMenuItems();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <div>
            <h2 className="font-semibold text-sidebar-foreground">NexPlant</h2>
            <p className="text-xs text-sidebar-foreground/70 capitalize">
              {user.role.replace('_', ' ')} Dashboard
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={currentView === item.id}
                    onClick={() => setCurrentView(item.id)}
                    className="w-full justify-start"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Users className="h-4 w-4" />
                  <span>{user.username}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
