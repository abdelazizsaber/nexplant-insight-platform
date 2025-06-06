
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface User {
  username: string;
  role: string;
  company_id: number | null;
}

interface DashboardHeaderProps {
  user: User;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const formatRole = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <span className="text-sm text-muted-foreground">
          • {formatRole(user.role)}
        </span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="text-sm text-muted-foreground">
          Welcome, <span className="font-medium">{user.username}</span>
        </div>
        <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
          <span className="text-white font-medium text-sm">
            {user.username.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}
