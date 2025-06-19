
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardContent } from "@/components/DashboardContent";
import { apiClient } from "@/lib/api";

interface User {
  username: string;
  role: string;
  company_id: number | null;
}

interface SessionResponse {
  user: User;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState("dashboard");

  useEffect(() => {
    console.log("Dashboard component mounted");
    
    // Check session with backend
    checkUserSession();
  }, []);

  const checkUserSession = async () => {
    try {
      console.log("Checking user session...");
      
      // Check with backend if session is valid
      const sessionData = await apiClient.checkSession() as SessionResponse;
      console.log("Session data:", sessionData);
      
      if (sessionData && sessionData.user) {
        setUser(sessionData.user);
        // Also store in localStorage for quick access
        localStorage.setItem("user", JSON.stringify(sessionData.user));
      } else {
        // Try to get from localStorage if session check fails
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
          } catch (error) {
            console.error("Error parsing stored user data:", error);
            localStorage.removeItem("user");
          }
        }
      }
    } catch (error) {
      console.error("Session check failed:", error);
      // Clear any stored user data
      localStorage.removeItem("user");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  console.log("Dashboard render - user:", user, "loading:", loading);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log("No user found, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  console.log("Rendering dashboard for user:", user);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar user={user} currentView={currentView} setCurrentView={setCurrentView} />
        <SidebarInset className="flex-1">
          <DashboardHeader user={user} />
          <main className="flex-1 p-6">
            <DashboardContent user={user} currentView={currentView} />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
