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
  schedule_name: z.string().min(1, "Schedule name is required"),
  device_id: z.string().min(1, "Device is required"),
  product_id: z.number().min(1, "Product is required"),
  shift_id: z.number().min(1, "Shift is required"),
  scheduled_date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  is_recurring: z.boolean().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  all_shift: z.boolean().optional(),
}).refine((data) => {
  const [sh, sm] = data.start_time.split(":").map(Number);
  const [eh, em] = data.end_time.split(":").map(Number);

  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  const duration = (endMinutes - startMinutes + 1440) % 1440;

  // must be > 0 (non-zero duration)
  return duration > 0;
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

function timeStringToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function CreateScheduleForm({ onSuccess, devices, products, shifts }: CreateScheduleFormProps) {
  const [loading, setLoading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [allShift, setAllShift] = useState(false);
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
		const shiftStartMin = timeStringToMinutes(selectedShift.start_time);
		let shiftEndMin = timeStringToMinutes(selectedShift.end_time);
		let prodStartMin = timeStringToMinutes(startTime);
		let prodEndMin = timeStringToMinutes(endTime);

		// Handle overnight shift
		if (shiftEndMin <= shiftStartMin) {
		  shiftEndMin += 1440; // next day
		  if (prodEndMin <= prodStartMin) {
			prodEndMin += 1440;
		  }
		  if (prodStartMin < shiftStartMin) {
			prodStartMin += 1440;
		  }
		}

		const isValid =
		  prodStartMin >= shiftStartMin && prodEndMin <= shiftEndMin;

		if (!isValid) {
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
          schedule_name: data.schedule_name,
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
      setAllShift(false);
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
    
    // Auto-fill times if "all shift" is checked
    if (allShift && shift) {
      setValue("start_time", shift.start_time);
      setValue("end_time", shift.end_time);
    }
  };
  
  const handleAllShiftChange = (checked: boolean) => {
    setAllShift(checked);
    if (checked && selectedShift) {
      setValue("start_time", selectedShift.start_time);
      setValue("end_time", selectedShift.end_time);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="schedule_name">Schedule Name</Label>
        <Input
          id="schedule_name"
          placeholder="Enter unique schedule name"
          {...register("schedule_name")}
        />
        {errors.schedule_name && (
          <p className="text-sm text-red-500">{errors.schedule_name.message}</p>
        )}
      </div>

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

      <div className="flex items-center justify-between">
        <div className={`space-y-2 flex-1 ${isRecurring ? 'opacity-50' : ''}`}>
          <Label htmlFor="scheduled_date">Date</Label>
          <Input
            id="scheduled_date"
            type="date"
            disabled={isRecurring}
            {...register("scheduled_date")}
          />
          {errors.scheduled_date && (
            <p className="text-sm text-red-500">{errors.scheduled_date.message}</p>
          )}
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <Checkbox
            id="is_recurring"
            checked={isRecurring}
            onCheckedChange={(checked) => setIsRecurring(checked === true)}
          />
          <Label htmlFor="is_recurring">Recurring Schedule</Label>
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <Checkbox
          id="all_shift"
          checked={allShift}
          onCheckedChange={(checked) => handleAllShiftChange(checked === true)}
        />
        <Label htmlFor="all_shift">Use entire shift duration</Label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_time">Start Time</Label>
          <Input
            id="start_time"
            type="time"
            disabled={allShift}
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
            disabled={allShift}
            {...register("end_time")}
          />
          {errors.end_time && (
            <p className="text-sm text-red-500">{errors.end_time.message}</p>
          )}
        </div>
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