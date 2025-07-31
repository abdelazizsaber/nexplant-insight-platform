import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Shift {
  id: number;
  shift_name: string;
  start_time: string;
  end_time: string;
}

interface ShiftsTableProps {
  shifts: Shift[];
}

export function ShiftsTable({ shifts }: ShiftsTableProps) {
  if (shifts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No shifts found. Create your first shift to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Shift Name</TableHead>
          <TableHead>Start Time</TableHead>
          <TableHead>End Time</TableHead>
          <TableHead>Duration</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shifts.map((shift) => {
          const startTime = new Date(`1970-01-01T${shift.start_time}`);
          const endTime = new Date(`1970-01-01T${shift.end_time}`);
          const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          
          return (
            <TableRow key={shift.id}>
              <TableCell className="font-medium">{shift.shift_name}</TableCell>
              <TableCell>{shift.start_time}</TableCell>
              <TableCell>{shift.end_time}</TableCell>
              <TableCell>{duration.toFixed(1)} hours</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}