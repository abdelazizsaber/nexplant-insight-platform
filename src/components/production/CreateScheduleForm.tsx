import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const scheduleSchema = z.object({
  device_id: z.string().min(1, "Device is required"),
  product_id: z.number().min(1, "Product is required"),
  shift_id: z.number().min(1, "Shift is required"),
  scheduled_date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  is_recurring: z.boolean().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
}).refine((data) => {
  const start = new Date(`1970-01-01T${data.start_time}`);
  const end = new Date(`1970-01-01T${data.end_time}`);
  return end > start;
}, {
  message: "End time must be after start time",
  path: ["end_time"],
}).refine((data) => {
  if (data.is_recurring) {
    return data.start_date && data.end_date;
  }
  return true;
}, {
  message: "Start and end dates are required for recurring schedules",
  path: ["end_date"],
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface Device {
  device_id: string;
  device_name: string;
}

interface Product {
  id: number;
  product_name: string;
}

interface Shift {
  id: number;
  shift_name: string;
  start_time: string;
  end_time: string;
}

interface CreateScheduleFormProps {
  onSuccess: () => void;
  devices: Device[];
  products: Product[];
  shifts: Shift[];
}

export function CreateScheduleForm({ onSuccess, devices, products, shifts }: CreateScheduleFormProps) {
  const [loading, setLoading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema)
  });

  const startTime = watch("start_time");
  const endTime = watch("end_time");

  const validateTimesWithinShift = () => {
    if (selectedShift && startTime && endTime) {
      const shiftStart = new Date(`1970-01-01T${selectedShift.start_time}`);
      const shiftEnd = new Date(`1970-01-01T${selectedShift.end_time}`);
      const prodStart = new Date(`1970-01-01T${startTime}`);
      const prodEnd = new Date(`1970-01-01T${endTime}`);
      
      if (prodStart < shiftStart || prodEnd > shiftEnd) {
        toast({
          title: "Invalid Time",
          description: `Production times must be within shift hours (${selectedShift.start_time} - ${selectedShift.end_time})`,
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const onSubmit = async (data: ScheduleFormData) => {
    if (!validateTimesWithinShift()) {
      return;
    }

    setLoading(true);
    try {
      await apiClient.createProductionSchedule({
        device_id: data.device_id,
        product_id: data.product_id,
        shift_id: data.shift_id,
        scheduled_date: data.scheduled_date,
        start_time: data.start_time,
        end_time: data.end_time,
        is_recurring: isRecurring,
        start_date: data.start_date,
        end_date: data.end_date,
      });
      toast({
        title: "Success",
        description: "Production schedule created successfully",
      });
      reset();
      setIsRecurring(false);
      setSelectedShift(null);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create schedule",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShiftChange = (shiftId: string) => {
    const shift = shifts.find(s => s.id === parseInt(shiftId));
    setSelectedShift(shift || null);
    setValue("shift_id", parseInt(shiftId));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="device_id">Device</Label>
          <Select onValueChange={(value) => setValue("device_id", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select device" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem key={device.device_id} value={device.device_id}>
                  {device.device_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.device_id && (
            <p className="text-sm text-red-500">{errors.device_id.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="product_id">Product</Label>
          <Select onValueChange={(value) => setValue("product_id", parseInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id.toString()}>
                  {product.product_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.product_id && (
            <p className="text-sm text-red-500">{errors.product_id.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="shift_id">Shift</Label>
        <Select onValueChange={handleShiftChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select shift" />
          </SelectTrigger>
          <SelectContent>
            {shifts.map((shift) => (
              <SelectItem key={shift.id} value={shift.id.toString()}>
                {shift.shift_name} ({shift.start_time} - {shift.end_time})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.shift_id && (
          <p className="text-sm text-red-500">{errors.shift_id.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="scheduled_date">Date</Label>
        <Input
          id="scheduled_date"
          type="date"
          {...register("scheduled_date")}
        />
        {errors.scheduled_date && (
          <p className="text-sm text-red-500">{errors.scheduled_date.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_time">Start Time</Label>
          <Input
            id="start_time"
            type="time"
            {...register("start_time")}
          />
          {selectedShift && (
            <p className="text-xs text-muted-foreground">
              Shift: {selectedShift.start_time} - {selectedShift.end_time}
            </p>
          )}
          {errors.start_time && (
            <p className="text-sm text-red-500">{errors.start_time.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_time">End Time</Label>
          <Input
            id="end_time"
            type="time"
            {...register("end_time")}
          />
          {errors.end_time && (
            <p className="text-sm text-red-500">{errors.end_time.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_recurring"
          checked={isRecurring}
          onCheckedChange={(checked) => setIsRecurring(checked === true)}
        />
        <Label htmlFor="is_recurring">Recurring Schedule</Label>
      </div>

      {isRecurring && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date</Label>
            <Input
              id="start_date"
              type="date"
              {...register("start_date")}
            />
            {errors.start_date && (
              <p className="text-sm text-red-500">{errors.start_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_date">End Date</Label>
            <Input
              id="end_date"
              type="date"
              {...register("end_date")}
            />
            {errors.end_date && (
              <p className="text-sm text-red-500">{errors.end_date.message}</p>
            )}
          </div>
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating..." : "Create Schedule"}
      </Button>
    </form>
  );
}