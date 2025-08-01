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

function parseTimeToDate(timeStr: string): Date {
  const [hours, minutes, seconds] = timeStr.split(":").map(Number);
  const date = new Date(1970, 0, 1, hours, minutes, seconds);
  return date;
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
		  const isValidTime = shift.start_time && shift.end_time;

		  let duration: number | null = null;

		  if (isValidTime) {
			const start = parseTimeToDate(shift.start_time);
			const end = parseTimeToDate(shift.end_time);
			duration = (end.getTime() - start.getTime()) / 3600000;

			// Handle overnight shift (e.g. 22:00 → 06:00)
			if (duration < 0) {
			  duration += 24;
			}
		  }

		  return (
			<TableRow key={shift.id}>
			  <TableCell className="font-medium">{shift.shift_name}</TableCell>
			  <TableCell>{shift.start_time}</TableCell>
			  <TableCell>{shift.end_time}</TableCell>
			  <TableCell>
				{duration !== null && !isNaN(duration)
				  ? `${duration.toFixed(1)} hours`
				  : <span className="text-muted-foreground italic">Invalid time</span>}
			  </TableCell>
			</TableRow>
		  );
		})}
      </TableBody>
    </Table>
  );
}