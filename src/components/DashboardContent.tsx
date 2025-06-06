
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Users, Monitor, Wifi, WifiOff } from "lucide-react";

interface User {
  username: string;
  role: string;
  company_id: number | null;
}

interface DashboardContentProps {
  user: User;
  currentView: string;
}

// Mock data for demonstration
const mockCompanies = [
  { id: 1, name: "Acme Manufacturing", devices: 45, users: 12, status: "active" },
  { id: 2, name: "TechCorp Industries", devices: 32, users: 8, status: "active" },
  { id: 3, name: "Global Automation", devices: 67, users: 15, status: "active" }
];

const mockUsers = [
  { id: 1, username: "john.doe", role: "user", company: "Acme Manufacturing", lastConnection: "2 hours ago", status: "online" },
  { id: 2, username: "jane.smith", role: "company_admin", company: "TechCorp Industries", lastConnection: "5 minutes ago", status: "online" },
  { id: 3, username: "mike.wilson", role: "user", company: "Global Automation", lastConnection: "1 day ago", status: "offline" }
];

const mockDevices = [
  { id: 1, name: "Temperature Sensor 01", type: "sensor", company: "Acme Manufacturing", status: "online", lastData: "2 minutes ago" },
  { id: 2, name: "Pressure Monitor 02", type: "monitor", company: "TechCorp Industries", status: "online", lastData: "1 minute ago" },
  { id: 3, name: "Flow Controller 03", type: "controller", company: "Global Automation", status: "offline", lastData: "3 hours ago" }
];

const mockMachines = [
  { id: 1, name: "Production Line A", devices: 8, status: "running", efficiency: 94 },
  { id: 2, name: "Assembly Unit B", devices: 5, status: "maintenance", efficiency: 0 },
  { id: 3, name: "Quality Control C", devices: 3, status: "running", efficiency: 87 }
];

export function DashboardContent({ user, currentView }: DashboardContentProps) {
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
                <div className="text-2xl font-bold">{mockCompanies.length}</div>
                <p className="text-xs text-muted-foreground">Active companies</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockUsers.length}</div>
                <p className="text-xs text-muted-foreground">Registered users</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockDevices.length}</div>
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
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Machines</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockMachines.length}</div>
              <p className="text-xs text-muted-foreground">Total machines</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Devices</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">16</div>
              <p className="text-xs text-muted-foreground">Connected devices</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
              <Wifi className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">91%</div>
              <p className="text-xs text-muted-foreground">Average OEE</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alerts</CardTitle>
              <WifiOff className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">2</div>
              <p className="text-xs text-muted-foreground">Active alerts</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (currentView) {
      case "dashboard":
        return renderDashboard();

      case "companies":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Companies</h2>
              <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
            </div>
            <div className="grid gap-4">
              {mockCompanies.map((company) => (
                <Card key={company.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {company.name}
                      <span className="text-sm font-normal text-green-600 bg-green-100 px-2 py-1 rounded">
                        {company.status}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      {company.devices} devices • {company.users} users
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
                <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              )}
            </div>
            <div className="grid gap-4">
              {mockUsers.map((userData) => (
                <Card key={userData.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {userData.username}
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-normal px-2 py-1 rounded ${
                          userData.status === "online" 
                            ? "text-green-600 bg-green-100" 
                            : "text-gray-600 bg-gray-100"
                        }`}>
                          {userData.status}
                        </span>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      {userData.role.replace('_', ' ')} • {userData.company} • Last seen: {userData.lastConnection}
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
              <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                <Plus className="h-4 w-4 mr-2" />
                Register Device
              </Button>
            </div>
            <div className="grid gap-4">
              {mockDevices.map((device) => (
                <Card key={device.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {device.name}
                      <div className="flex items-center gap-2">
                        {device.status === "online" ? (
                          <Wifi className="h-4 w-4 text-green-600" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`text-sm font-normal px-2 py-1 rounded ${
                          device.status === "online" 
                            ? "text-green-600 bg-green-100" 
                            : "text-red-600 bg-red-100"
                        }`}>
                          {device.status}
                        </span>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      {device.type} • {device.company} • Last data: {device.lastData}
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
                <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Machine
                </Button>
              )}
            </div>
            <div className="grid gap-4">
              {mockMachines.map((machine) => (
                <Card key={machine.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {machine.name}
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-normal px-2 py-1 rounded ${
                          machine.status === "running" 
                            ? "text-green-600 bg-green-100" 
                            : "text-orange-600 bg-orange-100"
                        }`}>
                          {machine.status}
                        </span>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      {machine.devices} devices • Efficiency: {machine.efficiency}%
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
