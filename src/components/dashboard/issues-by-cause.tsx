"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIssuesByCause } from "@/hooks/use-issues-by-cause";
import { useHasPermission, useUserAccess } from "@/hooks/use-user-access";
import { useSettings } from "@/hooks/use-settings";
import { useUsersDepartments } from "@/hooks/use-users-departments";
import { Loader2, AlertCircle, List, PieChart, Calendar, Users } from "lucide-react";
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

export default function IssuesByCause() {
  const router = useRouter();
  const [viewType, setViewType] = useState<'list' | 'pie'>('pie');
  const hasPermission = useHasPermission('issues-by-cause-report');
  const canViewIssuesDetail = useHasPermission('issues-detail-report');
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
  
  const { issuesByCause, loading, error } = useIssuesByCause({
    enabled: hasPermission,
    dept_id: deptIdFilter !== 'all' ? parseInt(deptIdFilter, 10) : undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
  });

  const chartData = useMemo(() => {
    if (!issuesByCause?.issues || issuesByCause.issues.length === 0) {
      return {
        labels: [],
        series: [],
        issues: [],
      };
    }

    // Filter out issues with 0 open issues and sort by count descending
    const filtered = issuesByCause.issues.filter(issue => issue.total_open_issues > 0);
    const sorted = [...filtered].sort(
      (a, b) => b.total_open_issues - a.total_open_issues
    );

    return {
      labels: sorted.map((item) => item.issue_name),
      series: sorted.map((item) => item.total_open_issues),
      issues: sorted,
    };
  }, [issuesByCause]);

  const handleIssueClick = useCallback((issueId: number) => {
    if (!canViewIssuesDetail) return;
    router.push(`/report/issues-detail?issue_id=${issueId}&status=0`);
  }, [router, canViewIssuesDetail]);

  const handlePieClick = useCallback((event: any, chartContext: any, config: any) => {
    if (!canViewIssuesDetail) return;
    const dataPointIndex = config.dataPointIndex;
    if (dataPointIndex !== undefined && chartData.issues) {
      const issue = chartData.issues[dataPointIndex];
      if (issue) {
        router.push(`/report/issues-detail?issue_id=${issue.issue_id}&status=0`);
      }
    }
  }, [chartData.issues, router, canViewIssuesDetail]);

  // Pie chart options
  const pieOptions: ApexOptions = useMemo(() => ({
    colors: ["#ff2c2c", "#465fff", "#12b76a", "#f79009", "#7a5af8", "#8b5cf6", "#ec4899", "#06b6d4"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "pie",
      height: 380,
      width: "100%",
      events: canViewIssuesDetail ? {
        dataPointSelection: handlePieClick,
      } : {},
    },
    labels: chartData.labels,
    legend: {
      show: true,
      position: "right",
      fontFamily: "Outfit, sans-serif",
      fontSize: "14px",
      fontWeight: 500,
      formatter: (seriesName: string, opts: any) => {
        const value = opts.w.globals.series[opts.seriesIndex];
        return `${seriesName}: ${value}`;
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
        const color = w.globals.colors[seriesIndex];
        
        return `
          <div class="apexcharts-tooltip-title" style="font-family: Outfit, sans-serif; font-size: 12px; font-weight: 600; margin-bottom: 4px;">
            ${label}
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 12px; height: 12px; background-color: ${color}; border-radius: 3px;"></span>
            <span class="apexcharts-tooltip-text" style="font-family: Outfit, sans-serif; font-size: 14px; font-weight: 600;">
              ${value} ${value === 1 ? 'issue' : 'issues'}
            </span>
          </div>
        `;
      },
    },
  }), [chartData.labels, handlePieClick, canViewIssuesDetail]);

  const pieSeries = chartData.series;

  // Don't render if user doesn't have permission
  if (!hasPermission) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-brand-green dark:text-brand-400" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Issues by Cause (Open)
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewType('list')}
              className={`p-1.5 rounded transition-colors ${
                viewType === 'list'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewType('pie')}
              className={`p-1.5 rounded transition-colors ${
                viewType === 'pie'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              title="Pie Chart"
            >
              <PieChart className="h-4 w-4" />
            </button>
          </div>
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

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center h-[200px]">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-gray-500 dark:text-gray-400">Loading issues...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[200px]">
            <div className="text-center">
              <div className="mb-2 text-red-600 dark:text-red-400">Error loading issues</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{error}</div>
            </div>
          </div>
        ) : !issuesByCause || issuesByCause.issues.length === 0 ? (
          <div className="flex items-center justify-center h-[200px]">
            <div className="text-gray-500 dark:text-gray-400">No issues available</div>
          </div>
        ) : viewType === 'list' ? (
          <div className="space-y-2 pb-2">
            {issuesByCause.issues.map((issue) => (
              <div
                key={issue.issue_id}
                onClick={canViewIssuesDetail ? () => handleIssueClick(issue.issue_id) : undefined}
                className={`flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 transition-all dark:border-gray-700 dark:bg-gray-800/50 ${
                  canViewIssuesDetail 
                    ? 'cursor-pointer hover:bg-gray-100 hover:border-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-600' 
                    : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {issue.issue_name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {issue.total_open_issues}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {issue.total_open_issues === 1 ? 'issue' : 'issues'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : chartData.labels.length === 0 ? (
          <div className="flex items-center justify-center h-[380px]">
            <div className="text-gray-500 dark:text-gray-400">No open issues to display</div>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            <div className="w-full max-w-2xl">
              <ReactApexChart
                key={`pie-chart-${viewType}`}
                options={pieOptions}
                series={pieSeries}
                type="pie"
                height={380}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
