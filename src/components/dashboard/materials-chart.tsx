"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMaterialsSummary } from "@/hooks/use-materials-summary";
import { useHasPermission } from "@/hooks/use-user-access";
import { Loader2, Package, ArrowRight } from "lucide-react";

// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function MaterialsChart() {
  const router = useRouter();
  const hasPermission = useHasPermission('materials-summary-report');
  const canViewMaterialsReport = useHasPermission('materials-report');
  
  const { materialsSummary, loading, error } = useMaterialsSummary({
    enabled: hasPermission,
  });

  const series = useMemo(() => {
    if (!materialsSummary) {
      return [0, 0, 0];
    }
    return [
      materialsSummary.total_required_material,
      materialsSummary.total_allocated_material,
      materialsSummary.total_installed_material,
    ];
  }, [materialsSummary]);

  const hasData = useMemo(() => {
    if (!materialsSummary) return false;
    const total = materialsSummary.total_required_material + 
                  materialsSummary.total_allocated_material + 
                  materialsSummary.total_installed_material;
    return total > 0;
  }, [materialsSummary]);

  const handleChartClick = useCallback((dataPointIndex: number) => {
    if (!canViewMaterialsReport) return;
    
    // Map chart slice index to status filter:
    // 0 = Required (status 0)
    // 1 = Allocated (status 1)  
    // 2 = Installed (status 2)
    const statusMap: Record<number, number> = {
      0: 0, // Required
      1: 1, // Allocated
      2: 2, // Installed
    };
    
    const params = new URLSearchParams();
    if (statusMap[dataPointIndex] !== undefined) {
      params.set('status', statusMap[dataPointIndex].toString());
    }
    const queryString = params.toString();
    router.push(`/report/materials${queryString ? `?${queryString}` : ''}`);
  }, [router, canViewMaterialsReport]);

  const handleViewDetails = useCallback(() => {
    if (!canViewMaterialsReport) return;
    router.push('/report/materials');
  }, [router, canViewMaterialsReport]);

  const options: ApexOptions = useMemo(() => ({
    colors: ["#ff2c2c", "#465fff", "#12b76a"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "donut",
      height: 380,
      width: "100%",
      events: canViewMaterialsReport ? {
        dataPointSelection: (event: any, chartContext: any, config: any) => {
          const dataPointIndex = config.dataPointIndex;
          handleChartClick(dataPointIndex);
        },
      } : {},
    },
    labels: ["Required", "Allocated", "Installed"],
    legend: {
      show: true,
      position: "right",
      fontFamily: "Outfit, sans-serif",
      fontSize: "16px",
      fontWeight: 500,
      formatter: (seriesName: string, opts: any) => {
        const value = opts.w.globals.series[opts.seriesIndex];
        const total = opts.w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
        return `${seriesName}: ${value} (${percentage}%)`;
      },
    },
    dataLabels: {
      enabled: false,
    },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: false,
          },
        },
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
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
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
  }), [handleChartClick, canViewMaterialsReport]);

  // Don't render if user doesn't have permission
  if (!hasPermission) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-brand-green dark:text-brand-400" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Materials (Required, Allocated & Installed)
          </h3>
        </div>
        {canViewMaterialsReport && (
          <button
            onClick={handleViewDetails}
            className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            View Details
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4 min-h-[380px]">
        {loading ? (
          <div className="flex items-center justify-center h-[380px]">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-gray-500 dark:text-gray-400">Loading materials data...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[380px]">
            <div className="text-center">
              <div className="mb-2 text-red-600 dark:text-red-400">Error loading materials data</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{error}</div>
            </div>
          </div>
        ) : !hasData ? (
          <div className="flex items-center justify-center h-[380px]">
            <div className="text-gray-500 dark:text-gray-400">No materials data available</div>
          </div>
        ) : (
          <div 
            className={`flex items-center justify-center w-full ${canViewMaterialsReport ? 'cursor-pointer' : ''}`}
            title={canViewMaterialsReport ? "Click on a slice to view materials report filtered by status" : undefined}
          >
            <div className="w-full max-w-2xl">
              <ReactApexChart
                options={options}
                series={series}
                type="donut"
                height={380}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
