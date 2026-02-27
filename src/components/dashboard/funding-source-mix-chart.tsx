"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useState, useMemo, useEffect } from "react";
import { useFundingSourceMix } from "@/hooks/use-funding-source-mix";
import { useHasPermission, useUserAccess } from "@/hooks/use-user-access";
import { useSettings } from "@/hooks/use-settings";
import { useUsersDepartments } from "@/hooks/use-users-departments";
import { Loader2, BarChart3, PieChart, DollarSign, Calendar, Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCurrentFinancialYearDates } from "@/lib/utils";

// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function FundingSourceMixChart() {
  const [chartType, setChartType] = useState<'bar' | 'pie'>('pie');
  const hasPermission = useHasPermission('funding-source-mix-report');
  const { access } = useUserAccess();
  const { settings } = useSettings();
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [deptIdFilter, setDeptIdFilter] = useState<string>('all');
  
  // Get current user ID for fetching departments
  const currentUserId = access?.user?.id;
  
  // Fetch user departments
  const { userDepartments, loading: departmentsLoading } = useUsersDepartments({ 
    user_id: currentUserId, 
    all: true 
  });
  
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
  
  const { fundingSourceMix, loading, error } = useFundingSourceMix({
    enabled: hasPermission,
    dept_id: deptIdFilter !== 'all' ? parseInt(deptIdFilter, 10) : undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
  });

  const chartData = useMemo(() => {
    if (!fundingSourceMix?.mix || fundingSourceMix.mix.length === 0) {
      return {
        labels: [],
        series: [],
      };
    }

    // Sort by project count descending for better visualization
    const sorted = [...fundingSourceMix.mix].sort(
      (a, b) => b.project_count - a.project_count
    );

    return {
      labels: sorted.map((item) => item.fs_name),
      series: sorted.map((item) => item.project_count),
    };
  }, [fundingSourceMix]);

  // Pie chart options
  const pieOptions: ApexOptions = useMemo(() => ({
    colors: ["#ff2c2c", "#465fff", "#12b76a", "#f79009", "#7a5af8"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "pie",
      height: 380,
      width: "100%",
    },
    labels: chartData.labels,
    legend: {
      show: true,
      position: "right",
      fontFamily: "Outfit, sans-serif",
      fontSize: "16px",
      fontWeight: 500,
      formatter: (seriesName: string, opts: any) => {
        const value = opts.w.globals.series[opts.seriesIndex];
        // Use percentage from API data if available, otherwise calculate
        const mixItem = fundingSourceMix?.mix.find((item) => item.fs_name === seriesName);
        const percentage = mixItem
          ? mixItem.percentage.toFixed(1)
          : ((value / (fundingSourceMix?.total_projects || 1)) * 100).toFixed(1);
        return `${seriesName}: ${value} (${percentage}%)`;
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
        const value = series[seriesIndex];
        // Use percentage from API data if available, otherwise calculate
        const mixItem = fundingSourceMix?.mix.find((item) => item.fs_name === label);
        const percentage = mixItem
          ? mixItem.percentage.toFixed(1)
          : ((value / (fundingSourceMix?.total_projects || 1)) * 100).toFixed(1);
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
  }), [chartData.labels, fundingSourceMix]);

  // Bar chart options
  const barOptions: ApexOptions = useMemo(() => ({
    colors: ["#465FFF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 380,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 1,
      colors: ["transparent"],
    },
    xaxis: {
      categories: chartData.labels,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        formatter: (val: string) => val,
      },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => `${val}`,
      },
    },
    legend: {
      show: false,
    },
    grid: {
      xaxis: {
        lines: {
          show: true,
        },
      },
      yaxis: {
        lines: {
          show: false,
        },
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: (val: number) => {
          const mixItem = fundingSourceMix?.mix.find((item) => item.project_count === val);
          const percentage = mixItem
            ? mixItem.percentage.toFixed(1)
            : ((val / (fundingSourceMix?.total_projects || 1)) * 100).toFixed(1);
          return `${val} projects (${percentage}%)`;
        },
      },
    },
  }), [chartData.labels, fundingSourceMix]);

  const pieSeries = chartData.series;
  
  const barSeries = [
    {
      name: "Projects",
      data: chartData.series,
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
          <DollarSign className="h-5 w-5 text-brand-green dark:text-brand-400" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Funding Source Mix
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
              {userDepartments
                .filter(ud => ud.department?.dept_id)
                .map((ud) => (
                  <SelectItem key={ud.department!.dept_id} value={ud.department!.dept_id.toString()}>
                    {ud.department!.name}
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

      <div className="mt-4 min-h-[380px]">
        {loading ? (
          <div className="flex items-center justify-center h-[380px]">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-gray-500 dark:text-gray-400">Loading chart data...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[380px]">
            <div className="text-center">
              <div className="mb-2 text-red-600 dark:text-red-400">Error loading chart data</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{error}</div>
            </div>
          </div>
        ) : chartData.labels.length === 0 ? (
          <div className="flex items-center justify-center h-[380px]">
            <div className="text-gray-500 dark:text-gray-400">No data available</div>
          </div>
        ) : chartType === 'bar' ? (
          <div className="min-w-[600px] pt-5 pb-2">
            <ReactApexChart
              options={barOptions}
              series={barSeries}
              type="bar"
              height={380}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            <div className="w-full max-w-2xl">
              <ReactApexChart
                options={pieOptions}
                series={pieSeries}
                type="pie"
                height={380}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
