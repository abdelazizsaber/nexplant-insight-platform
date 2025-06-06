
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardContent } from "@/components/DashboardContent";

interface User {
  username: string;
  role: string;
  company_id: number | null;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState("dashboard");

  useEffect(() => {
    console.log("Dashboard component mounted");
    
    // Check if user is logged in
    const storedUser = localStorage.getItem("user");
    console.log("Stored user data:", storedUser);
    
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log("Parsed user:", parsedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("user");
      }
    } else {
      console.log("No user data found in localStorage");
    }
    
    setLoading(false);
  }, []);

  console.log("Dashboard render - user:", user, "loading:", loading);

  // Show loading while checking authentication
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
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
