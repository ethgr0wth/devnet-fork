import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ShimmerProps {
  className?: string;
  testId?: string;
}

function ShimmerBase({ className, testId }: ShimmerProps) {
  return (
    <div 
      className={cn("relative overflow-hidden rounded-lg bg-slate-800/50", className)}
      data-testid={testId}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ x: ["0%", "200%"] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 0.5,
        }}
      />
    </div>
  );
}

export function ShimmerText({ className, lines = 1 }: ShimmerProps & { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <ShimmerBase
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full",
            className
          )}
        />
      ))}
    </div>
  );
}

export function ShimmerAvatar({ className, size = "md" }: ShimmerProps & { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  };
  return <ShimmerBase className={cn("rounded-full", sizeClasses[size], className)} />;
}

export function ShimmerButton({ className, testId }: ShimmerProps) {
  return <ShimmerBase className={cn("h-10 w-24 rounded-md", className)} testId={testId} />;
}

export function ShimmerCard({ className, testId }: ShimmerProps) {
  return (
    <div 
      className={cn("rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 space-y-4", className)}
      data-testid={testId || "shimmer-card"}
    >
      <div className="flex items-center gap-4">
        <ShimmerAvatar size="md" />
        <div className="flex-1 space-y-2">
          <ShimmerBase className="h-4 w-1/3" />
          <ShimmerBase className="h-3 w-1/2" />
        </div>
      </div>
      <ShimmerText lines={3} />
      <div className="flex gap-2">
        <ShimmerButton />
        <ShimmerButton className="w-16" />
      </div>
    </div>
  );
}

export function ShimmerApiKeyCard({ className, testId }: ShimmerProps) {
  return (
    <div 
      className={cn("rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 space-y-3", className)}
      data-testid={testId || "shimmer-apikey-card"}
    >
      <div className="flex items-center justify-between">
        <ShimmerBase className="h-5 w-32" />
        <ShimmerBase className="h-6 w-16 rounded-full" />
      </div>
      <ShimmerBase className="h-10 w-full rounded-md" />
      <div className="flex items-center justify-between">
        <ShimmerBase className="h-4 w-24" />
        <div className="flex gap-2">
          <ShimmerBase className="h-8 w-8 rounded-md" />
          <ShimmerBase className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function ShimmerModelCard({ className, testId }: ShimmerProps) {
  return (
    <div 
      className={cn("rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 space-y-2", className)}
      data-testid={testId || "shimmer-model-card"}
    >
      <div className="flex items-center gap-3">
        <ShimmerBase className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-1">
          <ShimmerBase className="h-4 w-2/3" />
          <ShimmerBase className="h-3 w-1/2" />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <ShimmerBase className="h-5 w-14 rounded-full" />
        <ShimmerBase className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function ShimmerUsageStats({ className, testId }: ShimmerProps) {
  return (
    <div 
      className={cn("rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 space-y-4", className)}
      data-testid={testId || "shimmer-usage-stats"}
    >
      <ShimmerBase className="h-5 w-28" />
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <ShimmerBase className="h-4 w-24" />
          <ShimmerBase className="h-4 w-16" />
        </div>
        <ShimmerBase className="h-2 w-full rounded-full" />
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <ShimmerBase className="h-4 w-20" />
          <ShimmerBase className="h-4 w-20" />
        </div>
        <ShimmerBase className="h-2 w-full rounded-full" />
      </div>
    </div>
  );
}

export function ShimmerTable({ rows = 5, cols = 4, className }: ShimmerProps & { rows?: number; cols?: number }) {
  return (
    <div className={cn("rounded-xl border border-slate-700/50 bg-slate-800/30 overflow-hidden", className)}>
      <div className="border-b border-slate-700/50 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <ShimmerBase key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="border-b border-slate-700/30 px-4 py-3 flex gap-4 last:border-b-0">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <ShimmerBase key={colIdx} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ShimmerDashboard({ className }: ShimmerProps) {
  return (
    <div className={cn("space-y-6", className)} data-testid="shimmer-dashboard">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <ShimmerBase className="h-8 w-48" testId="shimmer-title" />
          <ShimmerBase className="h-4 w-64" testId="shimmer-subtitle" />
        </div>
        <ShimmerButton testId="shimmer-button-action" />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="shimmer-usage-grid">
        <ShimmerUsageStats testId="shimmer-usage-1" />
        <ShimmerUsageStats testId="shimmer-usage-2" />
        <ShimmerUsageStats testId="shimmer-usage-3" />
      </div>

      <div className="space-y-4" data-testid="shimmer-apikeys-section">
        <ShimmerBase className="h-6 w-32" testId="shimmer-apikeys-title" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ShimmerApiKeyCard testId="shimmer-apikey-1" />
          <ShimmerApiKeyCard testId="shimmer-apikey-2" />
          <ShimmerApiKeyCard testId="shimmer-apikey-3" />
        </div>
      </div>

      <div className="space-y-4" data-testid="shimmer-models-section">
        <ShimmerBase className="h-6 w-40" testId="shimmer-models-title" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ShimmerModelCard testId="shimmer-model-1" />
          <ShimmerModelCard testId="shimmer-model-2" />
          <ShimmerModelCard testId="shimmer-model-3" />
          <ShimmerModelCard testId="shimmer-model-4" />
        </div>
      </div>
    </div>
  );
}

export { ShimmerBase as Shimmer };
