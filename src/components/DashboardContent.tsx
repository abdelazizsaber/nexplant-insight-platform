import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Users, Monitor, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { CreateCompanyForm } from "./CreateCompanyForm";
import { RegisterDeviceForm } from "./RegisterDeviceForm";
import { AddUserForm } from "./AddUserForm";

interface User {
  username: string;
  role: string;
  company_id: number | null;
}

interface DashboardContentProps {
  user: User;
  currentView: string;
}

interface Company {
  id: string;
  name: string;
  status: string;
  device_count?: number;
  user_count?: number;
}

interface Device {
  id: string;
  name: string;
  device_id: string;
  device_type: string;
  company_name?: string;
  status: string;
  last_data?: string;
}

interface UserData {
  id: number;
  username: string;
  role: string;
  company_name?: string;
  status: string;
  last_connection?: string;
}

export function DashboardContent({ user, currentView }: DashboardContentProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [currentView, user]);

  const fetchCompaniesWithCounts = async () => {
    try {
      // First get all companies
      const companiesData = await apiClient.getCompanies() as Company[];
      
      // Then fetch user and device counts for each company
      const companiesWithCounts = await Promise.all(
        companiesData.map(async (company) => {
          try {
            const [usersData, devicesData] = await Promise.all([
              apiClient.getUsers(company.id) as Promise<UserData[]>,
              apiClient.getDevices(company.id) as Promise<Device[]>
            ]);
            
            return {
              ...company,
              user_count: usersData.length,
              device_count: devicesData.length
            };
          } catch (error) {
            console.error(`Error fetching counts for company ${company.id}:`, error);
            return {
              ...company,
              user_count: 0,
              device_count: 0
            };
          }
        })
      );
      
      setCompanies(companiesWithCounts);
    } catch (error) {
      console.error("Error fetching companies:", error);
      throw error;
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (currentView) {
        case "companies":
          if (user.role === "global_admin") {
            await fetchCompaniesWithCounts();
          }
          break;
        case "users":
        case "all-users":
          const usersData = await apiClient.getUsers(
            user.role === "global_admin" ? undefined : user.company_id?.toString()
          ) as UserData[];
          setUsers(usersData);
          break;
        case "devices":
        case "all-devices":
          const devicesData = await apiClient.getDevices(
            user.role === "global_admin" ? undefined : user.company_id?.toString()
          ) as Device[];
          setDevices(devicesData);
          break;
        case "dashboard":
          // Fetch summary data for dashboard
          if (user.role === "global_admin") {
            const [usersData, devicesData] = await Promise.all([
              apiClient.getUsers() as Promise<UserData[]>,
              apiClient.getDevices() as Promise<Device[]>
            ]);
            await fetchCompaniesWithCounts();
            setUsers(usersData);
            setDevices(devicesData);
          } else {
            const [usersData, devicesData] = await Promise.all([
              apiClient.getUsers(user.company_id?.toString()) as Promise<UserData[]>,
              apiClient.getDevices(user.company_id?.toString()) as Promise<Device[]>
            ]);
            setUsers(usersData);
            setDevices(devicesData);
          }
          break;
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch data from server",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => {
    if (user.role === "global_admin") {
      return (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{companies.length}</div>
                <p className="text-xs text-muted-foreground">Active companies</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
                <p className="text-xs text-muted-foreground">Registered users</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{devices.length}</div>
                <p className="text-xs text-muted-foreground">Connected devices</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Wifi className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">98%</div>
                <p className="text-xs text-muted-foreground">Uptime</p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Company admin and user dashboard
    const connectedDevices = devices.filter(d => d.status === "connected").length;
    const totalDevices = devices.length;
    const activeUsers = users.filter(u => u.status === "active").length;

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeUsers}</div>
              <p className="text-xs text-muted-foreground">Active users</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Devices</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDevices}</div>
              <p className="text-xs text-muted-foreground">Total devices</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connected</CardTitle>
              <Wifi className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{connectedDevices}</div>
              <p className="text-xs text-muted-foreground">Online devices</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alerts</CardTitle>
              <WifiOff className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{totalDevices - connectedDevices}</div>
              <p className="text-xs text-muted-foreground">Offline devices</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case "dashboard":
        return renderDashboard();

      case "companies":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Companies</h2>
              <CreateCompanyForm onCompanyCreated={fetchData} />
            </div>
            <div className="grid gap-4">
              {companies.map((company) => (
                <Card key={company.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {company.name}
                      <span className={`text-sm font-normal px-2 py-1 rounded ${
                        company.status === "Active" 
                          ? "text-green-600 bg-green-100" 
                          : "text-red-600 bg-red-100"
                      }`}>
                        {company.status}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      ID: {company.id} • {company.device_count || 0} devices • {company.user_count || 0} users
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        );

      case "users":
      case "all-users":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Users</h2>
              {user.role !== "user" && (
                <AddUserForm user={user} onUserAdded={fetchData} />
              )}
            </div>
            <div className="grid gap-4">
              {users.map((userData) => (
                <Card key={userData.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {userData.username}
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-normal px-2 py-1 rounded ${
                          userData.status === "Online" 
                            ? "text-green-600 bg-green-100" 
                            : "text-gray-600 bg-gray-100"
                        }`}>
                          {userData.status}
                        </span>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      {userData.role.replace('_', ' ')} • {userData.company_name} • Last seen: {userData.last_connection || 'Never'}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        );

      case "devices":
      case "all-devices":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Devices</h2>
              <RegisterDeviceForm user={user} onDeviceRegistered={fetchData} />
            </div>
            <div className="grid gap-4">
              {devices.map((device) => (
                <Card key={device.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {device.name}
                      <div className="flex items-center gap-2">
                        {device.status === "Online" ? (
                          <Wifi className="h-4 w-4 text-green-600" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`text-sm font-normal px-2 py-1 rounded ${
                          device.status === "Online" 
                            ? "text-green-600 bg-green-100" 
                            : "text-red-600 bg-red-100"
                        }`}>
                          {device.status}
                        </span>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      {device.device_type} • ID: {device.device_id} • {device.company_name}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        );

      case "machines":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Machines</h2>
              {user.role === "company_admin" && (
                <RegisterDeviceForm user={user} onDeviceRegistered={fetchData} />
              )}
            </div>
            <div className="grid gap-4">
              {devices.map((device) => (
                <Card key={device.device_id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {device.name}
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-normal px-2 py-1 rounded ${
                          device.status === "Online" 
                            ? "text-green-600 bg-green-100" 
                            : "text-orange-600 bg-orange-100"
                        }`}>
                          {device.status}
                        </span>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      Type: {device.device_type} • ID: {device.device_id}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        );

      default:
        return renderDashboard();
    }
  };

  return (
    <div className="space-y-6">
      {renderContent()}
    </div>
  );
}
