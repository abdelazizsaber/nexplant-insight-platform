
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Gauge, TrendingUp, Clock, AlertTriangle } from "lucide-react";

interface User {
  username: string;
  role: string;
  company_id: number | null;
}

interface ProductionDashboardProps {
  user: User;
}

interface OEEData {
  schedule_name: string;
  device_name: string;
  product_name: string;
  oee_percentage: number;
  performance: number;
  availability: number;
  total_count: number;
  rated_count: number;
  shift_name: string;
}

interface TimeseriesData {
  timestamp: string;
  device_data: number;
  device_name: string;
}

interface DowntimeData {
  shift_name: string;
  product_name: string;
  device_name: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  details: string;
}

const OEEGauge = ({ percentage, title }: { percentage: number; title: string }) => {
  const getColor = (value: number) => {
    if (value >= 80) return "text-green-600";
    if (value >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted-foreground opacity-20"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${percentage}, 100`}
            className={getColor(percentage)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`text-2xl font-bold ${getColor(percentage)}`}>
              {percentage.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">OEE</div>
          </div>
        </div>
      </div>
      <h3 className="text-sm font-medium text-center">{title}</h3>
    </div>
  );
};

export function ProductionDashboard({ user }: ProductionDashboardProps) {
  const [oeeData, setOeeData] = useState<OEEData[]>([]);
  const [timeseriesData, setTimeseriesData] = useState<TimeseriesData[]>([]);
  const [downtimeData, setDowntimeData] = useState<DowntimeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const fetchDashboardData = async () => {
    try {
      const [oee, timeseries, downtime] = await Promise.all([
        apiClient.getOEEData(user.company_id?.toString() || ''),
        apiClient.getTimeseriesData(user.company_id?.toString() || ''),
        apiClient.getDowntimeData(user.company_id?.toString() || '')
      ]);
      
      setOeeData(oee as OEEData[]);
      setTimeseriesData(timeseries as TimeseriesData[]);
      setDowntimeData(downtime as DowntimeData[]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch production dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    setRefreshInterval(interval);
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [user.company_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading production dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Production Dashboard</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">OEE Display:</label>
            <select 
              className="px-3 py-1 border rounded-md text-sm"
              defaultValue="schedule"
            >
              <option value="schedule">Per Schedule</option>
              <option value="shift">Per Shift</option>
            </select>
          </div>
          <Badge variant="outline" className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Live Data
          </Badge>
        </div>
      </div>

      {/* OEE Gauges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Overall Equipment Effectiveness (OEE)
          </CardTitle>
          <CardDescription>
            Real-time OEE calculation per schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {oeeData.map((device) => (
              <Card key={device.schedule_name} className="p-4">
                <OEEGauge 
                  percentage={device.oee_percentage} 
                  title={device.schedule_name}
                />
				
                <div className="mt-4 space-y-2 text-sm">
				  <div className="flex justify-between">
                    <span className="text-muted-foreground">Device:</span>
                    <span className="font-medium">{device.device_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Product:</span>
                    <span className="font-medium">{device.product_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shift:</span>
                    <span className="font-medium">{device.shift_name}</span>
                  </div>
				  <div className="flex justify-between">
                    <span className="text-muted-foreground">Performance (%):</span>
                    <span className="font-medium">{device.performance.toLocaleString()}</span>
                  </div>
				  <div className="flex justify-between">
                    <span className="text-muted-foreground">availability (%):</span>
                    <span className="font-medium">{device.availability.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Count:</span>
                    <span className="font-medium">{device.total_count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rated Count:</span>
                    <span className="font-medium">{device.rated_count.toLocaleString()}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeseries Charts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Real-time Production Data
          </CardTitle>
          <CardDescription>
            Device data vs rated speed over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Group timeseries data by device */}
            {Object.entries(
              timeseriesData.reduce((acc, item) => {
                if (!acc[item.device_name]) {
                  acc[item.device_name] = [];
                }
                acc[item.device_name].push(item);
                return acc;
              }, {} as Record<string, TimeseriesData[]>)
            ).map(([deviceName, data]) => (
              <div key={deviceName} className="space-y-2">
                <h4 className="text-lg font-medium">{deviceName}</h4>
                  <div className="h-80 w-full overflow-hidden">
                    <ChartContainer
                      config={{
                        device_data: {
                          label: "Actual Data",
                          color: "hsl(var(--primary))",
                        },
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="timestamp" 
                            tickFormatter={(value) => {
                              const date = new Date(value);
                              const hours = date.getHours();
                              const minutes = date.getMinutes();
                              
                              // Show date at beginning of day (00:00)
                              if (hours === 0 && minutes === 0) {
                                return date.toLocaleDateString();
                              }
                              
                              // Show time for other points
                              return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                            }}
                            interval="preserveStartEnd"
                            minTickGap={50}
                          />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="device_data" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            name="Actual Data"
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Downtime Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Downtime Analysis
          </CardTitle>
          <CardDescription>
            Periods of zero production and below-threshold performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Device</th>
				  <th className="text-left p-2">Product</th>
				  <th className="text-left p-2">Shift</th>
                  <th className="text-left p-2">Start Time</th>
                  <th className="text-left p-2">End Time</th>
                  <th className="text-left p-2">Duration</th>
                  <th className="text-left p-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {downtimeData.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{item.device_name}</td>
					<td className="p-2">{item.product_name}</td>
					<td className="p-2">{item.shift_name}</td>
                    <td className="p-2">{new Date(item.start_time).toLocaleString()}</td>
                    <td className="p-2">{new Date(item.end_time).toLocaleString()}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {Math.floor(item.duration_minutes / 60)}h {item.duration_minutes % 60}m
                      </div>
                    </td>
					<td className="p-2">{item.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {downtimeData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No downtime events detected
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
