import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const productSchema = z.object({
  product_name: z.string().min(1, "Product name is required"),
  product_description: z.string().optional(),
  rated_speed: z.number().min(0.01, "Rated speed must be greater than 0"),
});

type ProductFormData = z.infer<typeof productSchema>;

interface CreateProductFormProps {
  onSuccess: () => void;
}

export function CreateProductForm({ onSuccess }: CreateProductFormProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema)
  });

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    try {
      await apiClient.createProduct({
        product_name: data.product_name,
        product_description: data.product_description,
        rated_speed: data.rated_speed
      });
      toast({
        title: "Success",
        description: "Product created successfully",
      });
      reset();
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="product_name">Product Name</Label>
        <Input
          id="product_name"
          {...register("product_name")}
          placeholder="e.g., Widget A, Component X"
        />
        {errors.product_name && (
          <p className="text-sm text-red-500">{errors.product_name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="product_description">Description (Optional)</Label>
        <Textarea
          id="product_description"
          {...register("product_description")}
          placeholder="Description of the product..."
          rows={3}
        />
        {errors.product_description && (
          <p className="text-sm text-red-500">{errors.product_description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="rated_speed">Rated Speed (units/min)</Label>
        <Input
          id="rated_speed"
          type="number"
          step="0.01"
          min="0.01"
          {...register("rated_speed", { valueAsNumber: true })}
          placeholder="e.g., 10.5"
        />
        {errors.rated_speed && (
          <p className="text-sm text-red-500">{errors.rated_speed.message}</p>
        )}
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating..." : "Create Product"}
      </Button>
    </form>
  );
}