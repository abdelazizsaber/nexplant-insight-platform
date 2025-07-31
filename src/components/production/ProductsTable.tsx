import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Product {
  id: number;
  product_name: string;
  product_description: string;
  rated_speed: number;
}

interface ProductsTableProps {
  products: Product[];
}

export function ProductsTable({ products }: ProductsTableProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No products found. Create your first product to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Rated Speed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id}>
            <TableCell className="font-medium">{product.product_name}</TableCell>
            <TableCell>{product.product_description || '-'}</TableCell>
            <TableCell>{product.rated_speed} units/min</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}