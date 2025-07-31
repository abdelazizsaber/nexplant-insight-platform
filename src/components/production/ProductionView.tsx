import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ShiftsTable } from "./ShiftsTable";
import { ProductsTable } from "./ProductsTable";
import { ProductionScheduleTable } from "./ProductionScheduleTable";
import { CreateShiftForm } from "./CreateShiftForm";
import { CreateProductForm } from "./CreateProductForm";
import { CreateScheduleForm } from "./CreateScheduleForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface User {
  username: string;
  role: string;
  company_id: number | null;
}

interface ProductionViewProps {
  user: User;
}

export function ProductionView({ user }: ProductionViewProps) {
  const [shifts, setShifts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialogs, setOpenDialogs] = useState({
    shift: false,
    product: false,
    schedule: false
  });
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [shiftsData, productsData, schedulesData, devicesData] = await Promise.all([
        apiClient.getShifts(),
        apiClient.getProducts(),
        apiClient.getProductionSchedule(),
        apiClient.getDevices()
      ]);

      setShifts(Array.isArray(shiftsData) ? shiftsData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
      setDevices(Array.isArray(devicesData) ? devicesData : []);
    } catch (error) {
      console.error("Error fetching production data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch production data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDialogClose = (type: string) => {
    setOpenDialogs(prev => ({ ...prev, [type]: false }));
    fetchData(); // Refresh data after closing dialog
  };

  const isCompanyAdmin = user.role === 'company_admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading production data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Production Management</h1>
      </div>

      <Tabs defaultValue="schedules" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schedules">Production Schedules</TabsTrigger>
          <TabsTrigger value="shifts">Shifts</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Production Schedules</CardTitle>
              {isCompanyAdmin && (
                <Dialog open={openDialogs.schedule} onOpenChange={(open) => setOpenDialogs(prev => ({ ...prev, schedule: open }))}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Schedule
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create Production Schedule</DialogTitle>
                    </DialogHeader>
                    <CreateScheduleForm 
                      onSuccess={() => handleDialogClose('schedule')}
                      devices={devices}
                      products={products}
                      shifts={shifts}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <ProductionScheduleTable schedules={schedules} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shifts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Shifts</CardTitle>
              {isCompanyAdmin && (
                <Dialog open={openDialogs.shift} onOpenChange={(open) => setOpenDialogs(prev => ({ ...prev, shift: open }))}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Shift
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Shift</DialogTitle>
                    </DialogHeader>
                    <CreateShiftForm onSuccess={() => handleDialogClose('shift')} />
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <ShiftsTable shifts={shifts} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Products</CardTitle>
              {isCompanyAdmin && (
                <Dialog open={openDialogs.product} onOpenChange={(open) => setOpenDialogs(prev => ({ ...prev, product: open }))}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Product</DialogTitle>
                    </DialogHeader>
                    <CreateProductForm onSuccess={() => handleDialogClose('product')} />
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <ProductsTable products={products} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}