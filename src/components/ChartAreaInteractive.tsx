"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// ── Chart configs ─────────────────────────────────────────────────────────────

const tomatoConfig = {
  ripe: {
    label: "Ripe",
    color: "var(--chart-1)",
  },
  unripe: {
    label: "Unripe",
    color: "var(--chart-2)",
  },
  rotten: {
    label: "Rotten",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const appointmentConfig = {
  pending: {
    label: "Pending",
    color: "var(--chart-2)",
  },
  confirmed: {
    label: "Confirmed",
    color: "var(--chart-3)",
  },
  completed: {
    label: "Completed",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

// ── Types ─────────────────────────────────────────────────────────────────────

interface TomatoEntry {
  date: string;
  ripe: number;
  unripe: number;
  rotten: number;
}

interface AppointmentEntry {
  date: string;
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChartAreaInteractive() {
  const [timeRange, setTimeRange] = React.useState<string>("90d");
  const [dataType, setDataType] = React.useState<string>("tomatoes");
  const [tomatoData, setTomatoData] = React.useState<TomatoEntry[]>([]);
  const [apptData, setApptData] = React.useState<AppointmentEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    api
      .get<any>("/appointments?per_page=200")
      .then((res) => {
        const appointments = res.data ?? [];

        // ── Tomato data ──────────────────────────────────────────────────────
        const tomatoGrouped: Record<string, TomatoEntry> = {};
        for (const appt of appointments) {
          const session = appt.sorting_session;
          if (!session) continue;
          const date = appt.scheduled_date;
          if (!tomatoGrouped[date]) {
            tomatoGrouped[date] = { date, ripe: 0, unripe: 0, rotten: 0 };
          }
          tomatoGrouped[date].ripe += session.ripe_count ?? 0;
          tomatoGrouped[date].unripe += session.unripe_count ?? 0;
          tomatoGrouped[date].rotten += session.rotten_count ?? 0;
        }

        // ── Appointment data ─────────────────────────────────────────────────
        const apptGrouped: Record<string, AppointmentEntry> = {};
        for (const appt of appointments) {
          const date = appt.scheduled_date;
          if (!apptGrouped[date]) {
            apptGrouped[date] = {
              date,
              total: 0,
              pending: 0,
              confirmed: 0,
              completed: 0,
            };
          }
          apptGrouped[date].total += 1;
          const status = appt.status as string;
          if (status === "pending") apptGrouped[date].pending += 1;
          if (status === "confirmed") apptGrouped[date].confirmed += 1;
          if (status === "completed") apptGrouped[date].completed += 1;
        }

        const sortByDate = (a: { date: string }, b: { date: string }) =>
          new Date(a.date).getTime() - new Date(b.date).getTime();

        setTomatoData(Object.values(tomatoGrouped).sort(sortByDate));
        setApptData(Object.values(apptGrouped).sort(sortByDate));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Filter by time range ───────────────────────────────────────────────────

  function filterByRange<T extends { date: string }>(data: T[]): T[] {
    return data.filter((item) => {
      const date = new Date(item.date);
      const ref = new Date();
      let days = 90;
      if (timeRange === "30d") days = 30;
      if (timeRange === "7d") days = 7;
      const start = new Date(ref);
      start.setDate(start.getDate() - days);
      return date >= start;
    });
  }

  const filteredTomato = filterByRange(tomatoData);
  const filteredAppt = filterByRange(apptData);

  const isTomato = dataType === "tomatoes";
  const chartData: any[] = isTomato ? filteredTomato : filteredAppt;
  const config = isTomato ? tomatoConfig : appointmentConfig;

  const handleTimeRange = (value: string | null) => {
    if (value) setTimeRange(value);
  };
  const handleDataType = (value: string | null) => {
    if (value) setDataType(value);
  };

  const description = isTomato
    ? "Ripe, unripe, and rotten counts from completed sessions"
    : "Total, pending, confirmed, and completed appointments by date";

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Sorting Overview</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>

        {/* Data type selector */}
        <Select value={dataType} onValueChange={handleDataType}>
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Select data"
          >
            <SelectValue placeholder="Tomatoes" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="tomatoes" className="rounded-lg">
              🍅 Tomatoes
            </SelectItem>
            <SelectItem value="appointments" className="rounded-lg">
              📅 Appointments
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Time range selector */}
        <Select value={timeRange} onValueChange={handleTimeRange}>
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:flex"
            aria-label="Select time range"
          >
            <SelectValue placeholder="Last 3 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">
              Last 3 months
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {loading ? (
          <div className="flex items-center justify-center h-[250px]">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
            No data available for this period.
          </div>
        ) : (
          <ChartContainer
            config={config}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={chartData}>
              <defs>
                {isTomato ? (
                  <>
                    <linearGradient id="fillRipe" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-ripe)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-ripe)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient id="fillUnripe" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-unripe)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-unripe)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient id="fillRotten" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-rotten)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-rotten)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </>
                ) : (
                  <>
                    <linearGradient
                      id="fillPending"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-pending)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-pending)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient
                      id="fillConfirmed"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-confirmed)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-confirmed)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient
                      id="fillCompleted"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-completed)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-completed)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </>
                )}
              </defs>

              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis
                domain={[0, 5]}
                tickCount={6}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                    indicator="dot"
                  />
                }
              />

              {isTomato ? (
                <>
                  <Area
                    dataKey="rotten"
                    type="natural"
                    fill="url(#fillRotten)"
                    stroke="var(--color-rotten)"
                    stackId="a"
                  />
                  <Area
                    dataKey="unripe"
                    type="natural"
                    fill="url(#fillUnripe)"
                    stroke="var(--color-unripe)"
                    stackId="a"
                  />
                  <Area
                    dataKey="ripe"
                    type="natural"
                    fill="url(#fillRipe)"
                    stroke="var(--color-ripe)"
                    stackId="a"
                  />
                </>
              ) : (
                <>
                  <Area
                    dataKey="completed"
                    type="monotone"
                    fill="url(#fillCompleted)"
                    stroke="var(--color-completed)"
                    fillOpacity={0.6}
                  />
                  <Area
                    dataKey="confirmed"
                    type="monotone"
                    fill="url(#fillConfirmed)"
                    stroke="var(--color-confirmed)"
                    fillOpacity={0.6}
                  />
                  <Area
                    dataKey="pending"
                    type="monotone"
                    fill="url(#fillPending)"
                    stroke="var(--color-pending)"
                    fillOpacity={0.6}
                  />
                </>
              )}

              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
