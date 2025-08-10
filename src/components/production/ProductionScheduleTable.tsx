import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Schedule {
  schedule_id: number;
  schedule_name: string;
  device_name: string;
  product_name: string;
  shift_name: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  rated_speed: number;
  status?: string;
  start_datetime?: string;
  end_datetime?: string;
  modification_date?: string;
}

interface ProductionScheduleTableProps {
  schedules: Schedule[];
}

export function ProductionScheduleTable({ schedules }: ProductionScheduleTableProps) {
  const getRowClassName = (schedule: Schedule) => {
	const status = schedule.status
    switch (status) {
      case 'current':
        return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
      case 'next':
        return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800';
      default:
        return '';
    }
  };

  const getStatusBadge = (schedule: Schedule) => {
	const status = schedule.status
    switch (status) {
      case 'current':
        return <Badge className="bg-green-500 hover:bg-green-600">Current</Badge>;
      case 'next':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Next</Badge>;
      default:
        return null;
    }
  };

  if (schedules.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No production schedules found. Create your first schedule to get started.
      </div>
    );
  }

  const formatDateTime = (dateStr: string, timeStr: string) => {
    const date = new Date(`${dateStr}T${timeStr}`);
    return date.toLocaleString();
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Schedule name</TableHead>
		  <TableHead>Start Date & Time</TableHead>
          <TableHead>End Date & Time</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Rated Speed</TableHead>
          <TableHead>Shift</TableHead>
          <TableHead>Device</TableHead>
		  <TableHead>Last Modification</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedules.map((schedule) => (
          <TableRow key={schedule.schedule_id} className={getRowClassName(schedule)}>
		    <TableCell>{schedule.schedule_name}</TableCell>
			<TableCell>{schedule.start_datetime || formatDateTime(schedule.scheduled_date, schedule.start_time)}</TableCell>
			<TableCell>{schedule.end_datetime || formatDateTime(schedule.scheduled_date, schedule.end_time)}</TableCell>
            <TableCell>{schedule.product_name}</TableCell>
            <TableCell>{schedule.rated_speed} units/min</TableCell>
            <TableCell>{schedule.shift_name}</TableCell>
            <TableCell className="font-medium">{schedule.device_name}</TableCell>
			<TableCell>{schedule.modification_date || '-'}</TableCell>
            <TableCell>{getStatusBadge(schedule)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}