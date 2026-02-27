"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useProgressByProjectType } from "@/hooks/use-progress-by-project-type";
import { useHasPermission } from "@/hooks/use-user-access";
import { useSettings } from "@/hooks/use-settings";
import { useDepartments } from "@/hooks/use-departments";
import { Loader2, ArrowRight, BarChart3, PieChart, FolderKanban, Calendar, Users } from "lucide-react";
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

export default function ProgressByProjectTypeChart() {
  const router = useRouter();
  const [chartType, setChartType] = useState<'bar' | 'pie'>('pie');
  const [chartKey, setChartKey] = useState(0);
  const hasPermission = useHasPermission('progress-by-project-type-report');
  const canViewProjectsSummary = useHasPermission('projects-summary-report');
  const { settings } = useSettings();
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
  
  const { progressData, loading, error } = useProgressByProjectType({
    enabled: hasPermission,
    dept_id: deptIdFilter !== 'all' ? parseInt(deptIdFilter, 10) : undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
  });

  const chartData = useMemo(() => {
    if (!progressData?.project_types || progressData.project_types.length === 0) {
      return {
        categories: [],
        data: [],
      };
    }

    // Sort by overall completion percentage descending
    const sorted = [...progressData.project_types].sort(
      (a, b) => b.overall_completion_percentage - a.overall_completion_percentage
    );

    return {
      categories: sorted.map((item) => item.ptype_name),
      data: sorted.map((item) => item.overall_completion_percentage),
    };
  }, [progressData]);

  const handleBarClick = useCallback((event: any, chartContext: any, config: any) => {
    if (!canViewProjectsSummary) return;
    const dataPointIndex = config.dataPointIndex;
    if (dataPointIndex !== undefined && progressData?.project_types) {
      const sorted = [...progressData.project_types].sort(
        (a, b) => b.overall_completion_percentage - a.overall_completion_percentage
      );
      const projectType = sorted[dataPointIndex];
      if (projectType) {
        router.push(`/report/projects-summary?ptype_id=${projectType.ptype_id}`);
      }
    }
  }, [progressData, router]);

  const handlePieClick = useCallback((event: any, chartContext: any, config: any) => {
    if (!canViewProjectsSummary) return;
    const dataPointIndex = config.dataPointIndex;
    if (dataPointIndex !== undefined && progressData?.project_types) {
      const sorted = [...progressData.project_types].sort(
        (a, b) => b.overall_completion_percentage - a.overall_completion_percentage
      );
      const projectType = sorted[dataPointIndex];
      if (projectType) {
        const params = new URLSearchParams();
        params.set('ptype_id', projectType.ptype_id.toString());
        if (deptIdFilter !== 'all') {
          params.set('dept_id', deptIdFilter);
        }
        if (fromDate) {
          params.set('from_date', fromDate);
        }
        if (toDate) {
          params.set('to_date', toDate);
        }
        const queryString = params.toString();
        router.push(`/report/projects-summary${queryString ? `?${queryString}` : ''}`);
      }
    }
  }, [progressData, router, canViewProjectsSummary, deptIdFilter, fromDate, toDate]);

  // Bar chart options
  const barOptions: ApexOptions = useMemo(() => ({
    colors: ["#465FFF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 350,
      toolbar: {
        show: false,
      },
      events: {
        dataPointSelection: handleBarClick,
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
      categories: chartData.categories,
      max: 100,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        formatter: (val: string) => `${val}%`,
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
      theme: "light",
      style: {
        fontSize: "12px",
        fontFamily: "Outfit, sans-serif",
      },
      custom: ({ series, seriesIndex, dataPointIndex, w }: any) => {
        const label = w.globals.labels[dataPointIndex];
        const value = Number(series[seriesIndex]?.[dataPointIndex]) || 0;
        const color = w.globals.colors[seriesIndex];
        
        return `
          <div class="apexcharts-tooltip-title" style="font-family: Outfit, sans-serif; font-size: 12px; font-weight: 600; margin-bottom: 4px;">
            ${label}
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 12px; height: 12px; background-color: ${color}; border-radius: 3px;"></span>
            <span class="apexcharts-tooltip-text" style="font-family: Outfit, sans-serif; font-size: 14px; font-weight: 600;">
              ${value.toFixed(2)}%
            </span>
          </div>
        `;
      },
    },
  }), [chartData.categories, handleBarClick]);

  // Pie chart options
  const pieOptions: ApexOptions = useMemo(() => ({
    colors: ["#465FFF", "#12b76a", "#f79009", "#7a5af8", "#ff2c2c", "#8b5cf6", "#ec4899", "#06b6d4"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "pie",
      height: 350,
      width: "100%",
      events: {
        dataPointSelection: handlePieClick,
      },
    },
    labels: chartData.categories,
    legend: {
      show: true,
      position: "right",
      fontFamily: "Outfit, sans-serif",
      fontSize: "14px",
      fontWeight: 500,
      formatter: (seriesName: string, opts: any) => {
        const value = opts.w.globals.series[opts.seriesIndex];
        return `${seriesName}: ${value.toFixed(2)}%`;
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
        const color = w.globals.colors[seriesIndex];
        
        return `
          <div class="apexcharts-tooltip-title" style="font-family: Outfit, sans-serif; font-size: 12px; font-weight: 600; margin-bottom: 4px;">
            ${label}
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 12px; height: 12px; background-color: ${color}; border-radius: 3px;"></span>
            <span class="apexcharts-tooltip-text" style="font-family: Outfit, sans-serif; font-size: 14px; font-weight: 600;">
              ${value.toFixed(2)}%
            </span>
          </div>
        `;
      },
    },
  }), [chartData.categories, handlePieClick]);

  const barSeries = [
    {
      name: "Completion %",
      data: chartData.data,
    },
  ];

  const pieSeries = chartData.data;

  const chartRef = useRef<HTMLDivElement>(null);

  // Handle label click for bar chart
  const handleLabelClick = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    // Check if clicked on label or tspan inside label
    const labelElement = target.closest('.apexcharts-yaxis-label') as HTMLElement;
    if (labelElement) {
      event.preventDefault();
      event.stopPropagation();
      const labelText = labelElement.textContent?.trim();
      if (labelText && canViewProjectsSummary && progressData?.project_types) {
        const sorted = [...progressData.project_types].sort(
          (a, b) => b.overall_completion_percentage - a.overall_completion_percentage
        );
        const projectType = sorted.find(pt => pt.ptype_name === labelText);
        if (projectType) {
          const params = new URLSearchParams();
          params.set('ptype_id', projectType.ptype_id.toString());
          if (deptIdFilter !== 'all') {
            params.set('dept_id', deptIdFilter);
          }
          if (fromDate) {
            params.set('from_date', fromDate);
          }
          if (toDate) {
            params.set('to_date', toDate);
          }
          const queryString = params.toString();
          router.push(`/report/projects-summary${queryString ? `?${queryString}` : ''}`);
        }
      }
    }
  }, [progressData, router, canViewProjectsSummary, deptIdFilter, fromDate, toDate]);

  // Add click handlers and styling to y-axis labels (only for bar chart)
  useEffect(() => {
    if (!chartRef.current || !progressData?.project_types || chartType !== 'bar') return;

    const styleLabels = () => {
      const labels = chartRef.current?.querySelectorAll('.apexcharts-yaxis-label');
      labels?.forEach((label) => {
        const labelElement = label as HTMLElement;
        if (canViewProjectsSummary) {
          labelElement.style.cursor = 'pointer';
          // Make the entire label group clickable
          labelElement.style.pointerEvents = 'auto';
          // Also style tspan elements inside
          const tspans = labelElement.querySelectorAll('tspan');
          tspans?.forEach((tspan) => {
            const tspanElement = tspan as unknown as HTMLElement;
            tspanElement.style.cursor = 'pointer';
            tspanElement.style.pointerEvents = 'auto';
          });
        } else {
          labelElement.style.cursor = 'default';
          labelElement.style.pointerEvents = 'auto';
        }
      });
    };

    const chartContainer = chartRef.current;
    
    // Style labels after a short delay to ensure chart is rendered
    const timeoutId = setTimeout(() => {
      styleLabels();
    }, 100);

    chartContainer.addEventListener('click', handleLabelClick);

    // Re-style labels when chart updates
    const observer = new MutationObserver(() => {
      styleLabels();
    });
    observer.observe(chartContainer, { childList: true, subtree: true });

    return () => {
      clearTimeout(timeoutId);
      chartContainer.removeEventListener('click', handleLabelClick);
      observer.disconnect();
    };
  }, [progressData, router, chartType, canViewProjectsSummary, handleLabelClick]);

  // Don't render if user doesn't have permission
  if (!hasPermission) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-brand-green dark:text-brand-400" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Progress by Project Type
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
            <button
              onClick={() => {
                setChartType('bar');
                setChartKey(prev => prev + 1);
              }}
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
              onClick={() => {
                setChartType('pie');
                setChartKey(prev => prev + 1);
              }}
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
          {canViewProjectsSummary && (
            <button
              onClick={() => {
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
                const queryString = params.toString();
                router.push(`/report/projects-summary${queryString ? `?${queryString}` : ''}`);
              }}
              className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              View Details
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
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

      <div className="mt-4 max-w-full overflow-x-auto overflow-y-visible custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-[350px]">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-gray-500 dark:text-gray-400">Loading chart data...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[350px]">
            <div className="text-center">
              <div className="mb-2 text-red-600 dark:text-red-400">Error loading chart data</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{error}</div>
            </div>
          </div>
        ) : chartData.categories.length === 0 ? (
          <div className="flex items-center justify-center h-[350px]">
            <div className="text-gray-500 dark:text-gray-400">No data available</div>
          </div>
        ) : chartType === 'bar' ? (
          <div key={`bar-container-${chartKey}`} ref={chartRef} className="min-w-[600px] pt-5 pb-2">
            <ReactApexChart
              key={`bar-chart-${chartKey}`}
              options={barOptions}
              series={barSeries}
              type="bar"
              height={350}
              style={{ cursor: 'pointer' }}
            />
          </div>
        ) : (
          <div key={`pie-container-${chartKey}`} className="pt-5 pb-2">
            <ReactApexChart
              key={`pie-chart-${chartKey}`}
              options={pieOptions}
              series={pieSeries}
              type="pie"
              height={350}
            />
          </div>
        )}
      </div>
    </div>
  );
}
