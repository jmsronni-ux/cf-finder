import React from "react";
import { cn } from "@/lib/utils";
import { Loader2, ArrowRight, Wallet } from "lucide-react";

type ButtonVariant = "start" | "loading" | "upgrade" | "upgradePending" | "withdraw" | "verifyWallet" | "verificationPending";

interface PulsatingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pulseColor?: string;
  duration?: string;
  variant?: ButtonVariant;
  isLoading?: boolean;
}

export const PulsatingButton = React.forwardRef<
  HTMLButtonElement,
  PulsatingButtonProps
>(
  (
    {
      className,
      children,
      pulseColor = "#808080",
      duration = "1.5s",
      variant = "start",
      isLoading = false,
      ...props
    },
    ref,
  ) => {
    // Determine if button should have subtle ambient glow
    const shouldPulse = variant === "start" || variant === "loading" || variant === "upgradePending" || variant === "verificationPending";

    // Get variant-specific styles — dark card aesthetic
    const getVariantStyles = () => {
      switch (variant) {
        case "upgrade":
          return "bg-[#0c0c0c] hover:bg-purple-500/[0.08] border-purple-500/30 hover:border-purple-500/50";
        case "upgradePending":
          return "bg-[#0c0c0c] border-amber-500/20 cursor-wait";
        case "verificationPending":
          return "bg-[#0c0c0c] border-amber-500/20 cursor-wait";
        case "verifyWallet":
          return "bg-[#0c0c0c] hover:bg-emerald-500/[0.06] border-emerald-500/25 hover:border-emerald-500/40";
        case "withdraw":
          return "bg-[#0c0c0c] hover:bg-amber-500/[0.06] border-amber-500/25 hover:border-amber-500/40";
        case "loading":
          return "bg-[#0c0c0c] border-purple-500/25 cursor-wait";
        case "start":
        default:
          return "bg-[#0c0c0c] hover:bg-purple-500/[0.06] border-purple-500/25 hover:border-purple-500/40";
      }
    };

    // Get button content based on variant
    const getContent = () => {
      if (isLoading) {
        return (
          <span className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400" />
            <span className="text-neutral-300">{typeof children === 'string' ? children : 'Loading...'}</span>
          </span>
        );
      }

      if (variant === "loading") {
        return (
          <span className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400/60" />
            <span className="text-neutral-300">{children}</span>
          </span>
        );
      }

      if (variant === "upgradePending") {
        return (
          <span className="flex items-center gap-2">
            <div className="relative flex-shrink-0">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              <div className="absolute inset-0 w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping opacity-40" />
            </div>
            <span className="text-amber-400/80 text-xs font-medium">
              {children || 'Upgrade Pending'}
            </span>
          </span>
        );
      }

      if (variant === "verificationPending") {
        return (
          <span className="flex items-center gap-2">
            <div className="relative flex-shrink-0">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              <div className="absolute inset-0 w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping opacity-40" />
            </div>
            <span className="text-amber-400/80 text-xs font-medium">
              {children || 'Verification Pending'}
            </span>
          </span>
        );
      }

      if (variant === "upgrade") {
        return (
          <span className="flex items-center gap-2">
            <span className="text-purple-300/90 text-xs font-medium">{children || 'UPGRADE'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-purple-400/60" />
          </span>
        );
      }

      if (variant === "verifyWallet") {
        return (
          <span className="flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5 text-emerald-400/60" />
            <span className="text-emerald-300/90 text-xs font-medium">{children || 'Verify Wallet'}</span>
          </span>
        );
      }

      if (variant === "withdraw") {
        return (
          <span className="flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5 text-amber-400/60" />
            <span className="text-amber-300/90 text-xs font-medium">Start scan</span>
          </span>
        );
      }

      // start variant
      return (
        <span className="text-neutral-300 text-xs font-medium">{children}</span>
      );
    };

    return (
      <button
        ref={ref}
        className={cn(
          "relative flex cursor-pointer z-[100] items-center justify-center rounded-xl px-5 h-9 text-center transition-all duration-200 border border-white/[0.07] shadow-2xl",
          getVariantStyles(),
          className,
        )}
        style={
          {
            "--pulse-color": pulseColor,
            "--duration": duration,
          } as React.CSSProperties
        }
        {...props}
      >
        <div className="relative z-10">{getContent()}</div>
        {shouldPulse && !props.disabled && (
          <div
            className="absolute left-1/2 top-1/2 size-full -translate-x-1/2 -translate-y-1/2 rounded-xl"
            style={{
              background: `radial-gradient(circle, ${pulseColor}15 0%, transparent 70%)`,
              animation: `pulse var(--duration) ease-out infinite`,
            }}
          />
        )}
      </button>
    );
  },
);

PulsatingButton.displayName = "PulsatingButton";
