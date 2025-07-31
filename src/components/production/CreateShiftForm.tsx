import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const shiftSchema = z.object({
  shift_name: z.string().min(1, "Shift name is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
}).refine((data) => {
  const start = new Date(`1970-01-01T${data.start_time}`);
  const end = new Date(`1970-01-01T${data.end_time}`);
  return end > start;
}, {
  message: "End time must be after start time",
  path: ["end_time"],
});

type ShiftFormData = z.infer<typeof shiftSchema>;

interface CreateShiftFormProps {
  onSuccess: () => void;
}

export function CreateShiftForm({ onSuccess }: CreateShiftFormProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema)
  });

  const onSubmit = async (data: ShiftFormData) => {
    setLoading(true);
    try {
      await apiClient.createShift({
        shift_name: data.shift_name,
        start_time: data.start_time,
        end_time: data.end_time
      });
      toast({
        title: "Success",
        description: "Shift created successfully",
      });
      reset();
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create shift",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="shift_name">Shift Name</Label>
        <Input
          id="shift_name"
          {...register("shift_name")}
          placeholder="e.g., Morning Shift, Night Shift"
        />
        {errors.shift_name && (
          <p className="text-sm text-red-500">{errors.shift_name.message}</p>
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

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating..." : "Create Shift"}
      </Button>
    </form>
  );
}