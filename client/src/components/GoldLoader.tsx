import { cn } from "@/lib/utils";

// Gold coin spinner - rotating coin with 3D effect
export function GoldCoinSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("inline-block", className)}>
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 animate-spin-slow shadow-lg shadow-yellow-500/50">
          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 flex items-center justify-center">
            <span className="text-yellow-900 font-bold text-xl">$</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Gold dollar sign pulse - pulsing $ symbol
export function GoldDollarPulse({ className }: { className?: string }) {
  return (
    <div className={cn("inline-block", className)}>
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent animate-pulse-slow">
            $
          </span>
        </div>
        <div className="absolute inset-0 rounded-full bg-yellow-500/20 animate-ping" />
      </div>
    </div>
  );
}

// Gold shimmer skeleton - for loading placeholders
export function GoldSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-gray-800/50",
        "before:absolute before:inset-0",
        "before:bg-gradient-to-r before:from-transparent before:via-yellow-500/20 before:to-transparent",
        "before:animate-shimmer",
        className
      )}
    />
  );
}

// Small gold spinner - for inline loading
export function GoldSpinnerSmall({ className }: { className?: string }) {
  return (
    <div className={cn("inline-block", className)}>
      <div className="w-4 h-4 rounded-full border-2 border-yellow-500/30 border-t-yellow-500 animate-spin" />
    </div>
  );
}

// Gold bars loading - stacked bars animation
export function GoldBarsLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-end gap-1", className)}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="w-2 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-sm animate-bars"
          style={{
            height: '24px',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}
