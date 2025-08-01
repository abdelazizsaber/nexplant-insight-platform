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
  device_name: string;
  product_name: string;
  shift_name: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  rated_speed: number;
}

interface ProductionScheduleTableProps {
  schedules: Schedule[];
}

export function ProductionScheduleTable({ schedules }: ProductionScheduleTableProps) {
  const getCurrentScheduleStatus = (schedule: Schedule) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // Get YYYY-MM-DD format
    
    // Parse schedule date and times more reliably
    const scheduleDate = schedule.scheduled_date;
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes
    
    // Parse start and end times to minutes
    const [startHour, startMin] = schedule.start_time.split(':').map(Number);
    const [endHour, endMin] = schedule.end_time.split(':').map(Number);
    const startTimeMinutes = startHour * 60 + startMin;
    let endTimeMinutes = endHour * 60 + endMin;
    
    // Handle overnight shifts (end time next day)
    if (endTimeMinutes <= startTimeMinutes) {
      endTimeMinutes += 24 * 60; // Add 24 hours in minutes
    }
    
    // Check if it's today's date
    if (scheduleDate === today) {
      // Handle overnight shift for current time comparison
      let currentTimeAdjusted = currentTime;
      if (endTimeMinutes > 24 * 60 && currentTime < 12 * 60) {
        // If it's an overnight shift and current time is in early morning, add 24 hours
        currentTimeAdjusted += 24 * 60;
      }
      
      if (currentTimeAdjusted >= startTimeMinutes && currentTimeAdjusted <= endTimeMinutes) {
        return 'current';
      } else if (currentTimeAdjusted < startTimeMinutes) {
        // Find the next upcoming schedule today
        const todaySchedules = schedules
          .filter(s => s.scheduled_date === today)
          .map(s => {
            const [sHour, sMin] = s.start_time.split(':').map(Number);
            return {
              ...s,
              startMinutes: sHour * 60 + sMin
            };
          })
          .filter(s => s.startMinutes > currentTime)
          .sort((a, b) => a.startMinutes - b.startMinutes);
        
        if (todaySchedules.length > 0 && todaySchedules[0].schedule_id === schedule.schedule_id) {
          return 'next';
        }
      }
    }
    
    return 'normal';
  };

  const getRowClassName = (schedule: Schedule) => {
    const status = getCurrentScheduleStatus(schedule);
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
    const status = getCurrentScheduleStatus(schedule);
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

  // Sort schedules by date and time
  const sortedSchedules = [...schedules].sort((a, b) => {
    const dateA = new Date(`${a.scheduled_date}T${a.start_time}`);
    const dateB = new Date(`${b.scheduled_date}T${b.start_time}`);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Device</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Shift</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Start Time</TableHead>
          <TableHead>End Time</TableHead>
          <TableHead>Rated Speed</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedSchedules.map((schedule) => (
          <TableRow key={schedule.schedule_id} className={getRowClassName(schedule)}>
            <TableCell className="font-medium">{schedule.device_name}</TableCell>
            <TableCell>{schedule.product_name}</TableCell>
            <TableCell>{schedule.shift_name}</TableCell>
            <TableCell>{new Date(schedule.scheduled_date).toLocaleDateString()}</TableCell>
            <TableCell>{schedule.start_time}</TableCell>
            <TableCell>{schedule.end_time}</TableCell>
            <TableCell>{schedule.rated_speed} units/min</TableCell>
            <TableCell>{getStatusBadge(schedule)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}