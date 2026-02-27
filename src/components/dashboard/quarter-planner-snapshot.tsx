"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuarterWiseProjects } from "@/hooks/use-quarter-wise-projects";
import { useHasPermission } from "@/hooks/use-user-access";
import { useSettings } from "@/hooks/use-settings";
import { useDepartments } from "@/hooks/use-departments";
import { Loader2, CalendarDays, Calendar, BarChart3, PieChart, Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCurrentFinancialYearDates, formatDateToDDMMYYYY } from "@/lib/utils";

// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function QuarterPlannerSnapshot() {
  const router = useRouter();
  const hasPermission = useHasPermission('quarter-wise-projects-report');
  const canViewProjectsSummary = useHasPermission('projects-summary-report');
  const { settings } = useSettings();
  const [chartType, setChartType] = useState<'bar' | 'pie'>('pie');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [deptIdFilter, setDeptIdFilter] = useState<string>('all');
  
  // Fetch all departments for filtering
  const { departments, loading: departmentsLoading } = useDepartments({ all: true });
  
  // Set default dates to current financial year
  useEffect(() => {
    if (settings && !fromDate && !toDate) {
      const yearStart = settings.year_start || '07-01';
      const yearEnd = settings.year_end || '06-30';
      const dates = getCurrentFinancialYearDates(yearStart, yearEnd);
      if (dates) {
        setFromDate(dates.from_date);
        setToDate(dates.to_date);
      }
    }
  }, [settings, fromDate, toDate]);
  
  const { quarterData, loading, error } = useQuarterWiseProjects({ 
    enabled: hasPermission,
    dept_id: deptIdFilter !== 'all' ? parseInt(deptIdFilter, 10) : undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
  });

  const chartData = useMemo(() => {
    if (!quarterData?.quarters || quarterData.quarters.length === 0) {
      return {
        categories: ["Q1", "Q2", "Q3", "Q4"],
        planned: [0, 0, 0, 0],
        started: [0, 0, 0, 0],
        completed: [0, 0, 0, 0],
        quarterDates: [
          { start: '', end: '' },
          { start: '', end: '' },
          { start: '', end: '' },
          { start: '', end: '' },
        ],
      };
    }

    // Ensure we have data for all 4 quarters, filling with 0 if missing
    const quartersMap = new Map(
      quarterData.quarters.map((q) => [q.quarter, q])
    );

    return {
      categories: ["Q1", "Q2", "Q3", "Q4"],
      planned: [1, 2, 3, 4].map(
        (q) => quartersMap.get(q)?.total_planned ?? 0
      ),
      started: [1, 2, 3, 4].map(
        (q) => quartersMap.get(q)?.total_started ?? 0
      ),
      completed: [1, 2, 3, 4].map(
        (q) => quartersMap.get(q)?.total_completed ?? 0
      ),
      quarterDates: [1, 2, 3, 4].map((q) => {
        const quarter = quartersMap.get(q);
        return {
          start: quarter?.start_date ? formatDateToDDMMYYYY(quarter.start_date) : '',
          end: quarter?.end_date ? formatDateToDDMMYYYY(quarter.end_date) : '',
        };
      }),
    };
  }, [quarterData]);

  const handleChartClick = useCallback((status: number | null) => {
    const params = new URLSearchParams();
    if (deptIdFilter !== 'all') {
      params.set('dept_id', deptIdFilter);
    }
    if (fromDate) {
      params.set('from_date', fromDate);
    }
    if (toDate) {
      params.set('to_date', toDate);
    }
    if (status !== null) {
      params.set('status', status.toString());
    }
    const queryString = params.toString();
    router.push(`/report/projects-summary${queryString ? `?${queryString}` : ''}`);
  }, [deptIdFilter, fromDate, toDate, router]);

  const handlePieClick = useCallback((quarterIndex: number, status: number) => {
    if (!canViewProjectsSummary) return;
    handleChartClick(status);
  }, [canViewProjectsSummary, handleChartClick]);

  // Bar chart options
  const barOptions: ApexOptions = useMemo(() => ({
    colors: ["#ff2c2c", "#465fff", "#12b76a"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 180,
      toolbar: {
        show: false,
      },
      events: canViewProjectsSummary ? {
        dataPointSelection: (event: any, chartContext: any, config: any) => {
          // config.dataPointIndex gives the quarter index (0-3)
          // config.seriesIndex gives the series index: 0=Planned, 1=Started, 2=Completed
          const status = config.seriesIndex; // 0 = Planned, 1 = Started, 2 = Completed
          handleChartClick(status);
        },
      } : {},
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "39%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 4,
      colors: ["transparent"],
    },
    xaxis: {
      categories: chartData.categories,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          fontSize: '12px',
          fontFamily: 'Outfit, sans-serif',
        },
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
    },
    yaxis: {
      title: {
        text: undefined,
      },
    },
    grid: {
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      x: {
        show: false,
      },
      y: {
        formatter: (val: number) => `${val}`,
      },
    },
  }), [handleChartClick, canViewProjectsSummary, chartData.categories, chartData.quarterDates]);

  // Pie chart options for each quarter
  const getPieOptions = useCallback((quarterIndex: number): ApexOptions => ({
    colors: ["#ff2c2c", "#465fff", "#12b76a"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "pie",
      height: 200,
      width: "100%",
      events: canViewProjectsSummary ? {
        dataPointSelection: (event: any, chartContext: any, config: any) => {
          const status = config.dataPointIndex; // 0 = Planned, 1 = Started, 2 = Completed
          handlePieClick(quarterIndex, status);
        },
      } : {},
    },
    labels: ["Planned", "Started", "Completed"],
    legend: {
      show: true,
      position: "right",
      fontFamily: "Outfit, sans-serif",
      fontSize: "14px",
      fontWeight: 500,
      formatter: (seriesName: string, opts: any) => {
        const value = opts.w.globals.series[opts.seriesIndex];
        const total = opts.w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
        const percentage = total > 0 ? ((value / total) * 100).toFixed(2) : '0.00';
        return `${seriesName}: ${percentage}%`;
      },
    },
    dataLabels: {
      enabled: false,
    },
    plotOptions: {
      pie: {
        offsetY: 0,
        expandOnClick: false,
      },
    },
    stroke: {
      show: false,
    },
    tooltip: {
      theme: "light",
      style: {
        fontSize: "12px",
        fontFamily: "Outfit, sans-serif",
      },
      custom: ({ series, seriesIndex, w }: any) => {
        const label = w.globals.labels[seriesIndex];
        const value = Number(series[seriesIndex]) || 0;
        const total = series.reduce((a: number, b: number) => a + b, 0);
        const percentage = total > 0 ? ((value / total) * 100).toFixed(2) : '0.00';
        const color = w.globals.colors[seriesIndex];
        
        return `
          <div class="apexcharts-tooltip-title" style="font-family: Outfit, sans-serif; font-size: 12px; font-weight: 600; margin-bottom: 4px;">
            ${label}
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 12px; height: 12px; background-color: ${color}; border-radius: 3px;"></span>
            <span class="apexcharts-tooltip-text" style="font-family: Outfit, sans-serif; font-size: 14px; font-weight: 600;">
              ${value} (${percentage}%)
            </span>
          </div>
        `;
      },
    },
  }), [canViewProjectsSummary, handlePieClick]);

  const series = [
    {
      name: "Planned",
      data: chartData.planned,
    },
    {
      name: "Started",
      data: chartData.started,
    },
    {
      name: "Completed",
      data: chartData.completed,
    },
  ];

  // Don't render if user doesn't have permission
  if (!hasPermission) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-brand-green dark:text-brand-400" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Quarter Planner Snapshot
          </h3>
        </div>
        <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
          <button
            onClick={() => setChartType('bar')}
            className={`p-1.5 rounded transition-colors ${
              chartType === 'bar'
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title="Bar Chart"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setChartType('pie')}
            className={`p-1.5 rounded transition-colors ${
              chartType === 'pie'
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title="Pie Chart"
          >
            <PieChart className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="mb-4 grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="department-filter" className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Department
          </Label>
          <Select value={deptIdFilter} onValueChange={setDeptIdFilter} disabled={departmentsLoading}>
            <SelectTrigger id="department-filter" className="w-full">
              <SelectValue placeholder={departmentsLoading ? "Loading..." : "All departments"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.dept_id} value={dept.dept_id.toString()}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="from-date" className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            From Date
          </Label>
          <Input
            id="from-date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <Label htmlFor="to-date" className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            To Date
          </Label>
          <Input
            id="to-date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-[180px]">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-gray-500 dark:text-gray-400">Loading chart data...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[180px]">
            <div className="text-center">
              <div className="mb-2 text-red-600 dark:text-red-400">Error loading chart data</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{error}</div>
            </div>
          </div>
        ) : chartType === 'bar' ? (
          <>
            <div 
              className={`-ml-5 min-w-[650px] xl:min-w-full pl-2 ${canViewProjectsSummary ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
              title={canViewProjectsSummary ? "Click on a bar to view projects summary report filtered by status and date range" : undefined}
            >
              <ReactApexChart
                options={barOptions}
                series={series}
                type="bar"
                height={180}
              />
            </div>
            <div className="grid grid-cols-4 gap-4 ml-7 pl-2 pr-5 pb-5">
              {[0, 1, 2, 3].map((quarterIndex) => {
                const dates = chartData.quarterDates[quarterIndex];
                return (
                  <div
                    key={quarterIndex}
                    className="flex flex-col items-center justify-center text-center px-2"
                  >
                    {dates.start && dates.end ? (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {dates.start} to {dates.end}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        -
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-6 mt-4 mb-4">
            {[0, 1, 2, 3].map((quarterIndex) => {
              const quarterData = [
                chartData.planned[quarterIndex],
                chartData.started[quarterIndex],
                chartData.completed[quarterIndex],
              ];
              const total = quarterData.reduce((a, b) => a + b, 0);
              
              return (
                <div
                  key={quarterIndex}
                  className={`flex flex-col items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800/30 p-4 ${canViewProjectsSummary ? 'cursor-pointer' : ''}`}
                  title={canViewProjectsSummary ? `Click on a slice in ${chartData.categories[quarterIndex]} to view projects summary report` : undefined}
                >
                  <div className="text-center mb-2">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {chartData.categories[quarterIndex]}
                    </h4>
                    {chartData.quarterDates[quarterIndex].start && chartData.quarterDates[quarterIndex].end && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {chartData.quarterDates[quarterIndex].start} to {chartData.quarterDates[quarterIndex].end}
                      </p>
                    )}
                  </div>
                  {total > 0 ? (
                    <div className="flex items-center justify-center flex-1">
                      <ReactApexChart
                        options={getPieOptions(quarterIndex)}
                        series={quarterData}
                        type="pie"
                        height={200}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center flex-1 min-h-[200px]">
                      <div className="text-sm text-gray-400 dark:text-gray-500">No data</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
