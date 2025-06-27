import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Company {
  company_id: string;
  company_name: string;
}

interface RegisterDeviceFormProps {
  user: {
    username: string;
    role: string;
    company_id: number | null;
  };
  onDeviceRegistered: () => void;
}

export function RegisterDeviceForm({ user, onDeviceRegistered }: RegisterDeviceFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [formData, setFormData] = useState({
    company_id: "",
    device_name: "",
    device_id: "",
    device_type: "",
    description: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open && user.role === "global_admin") {
      fetchCompanies();
    }
    if (open && user.company_id) {
      setFormData(prev => ({ ...prev, company_id: user.company_id.toString() }));
    }
  }, [open, user]);

  const fetchCompanies = async () => {
    try {
      const companiesData = await apiClient.getCompanies() as Company[];
      setCompanies(companiesData);
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const handleCompanyChange = (companyId: string) => {
    setFormData({ ...formData, company_id: companyId });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiClient.registerDevice(formData);
      toast({
        title: "Success",
        description: "Device registered successfully",
      });
      setOpen(false);
      setFormData({
        company_id: user.company_id?.toString() || "",
        device_name: "",
        device_id: "",
        device_type: "",
        description: ""
      });
      onDeviceRegistered();
    } catch (error) {
      console.error("Error registering device:", error);
      toast({
        title: "Error",
        description: "Failed to register device",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
          <Plus className="h-4 w-4 mr-2" />
          Register Device
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Register New Device</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {user.role === "global_admin" && (
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Select value={formData.company_id} onValueChange={handleCompanyChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.company_id} value={company.company_id}>
                      {company.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="device_name">Device Name</Label>
            <Input
              id="device_name"
              value={formData.device_name}
              onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="device_id">Device ID</Label>
            <Input
              id="device_id"
              value={formData.device_id}
              onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="device_type">Device Type</Label>
            <Input
              id="device_type"
              value={formData.device_type}
              onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Registering..." : "Register Device"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
