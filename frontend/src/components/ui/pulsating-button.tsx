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
    // Determine if button should pulse
    const shouldPulse = variant === "start" || variant === "loading" || variant === "upgradePending" || variant === "verificationPending";
    
    // Get variant-specific styles
    const getVariantStyles = () => {
      switch (variant) {
        case "upgrade":
          return "bg-[#4F1F7B] hover:from-purple-700 hover:bg-purple-800 shadow-lg border border-purple-500";
        case "upgradePending":
          return "bg-[#251F11] border border-yellow-500/30 cursor-wait";
        case "verificationPending":
          return "bg-[#251F11] border border-yellow-500/30 cursor-wait";
        case "verifyWallet":
          return "bg-[#1F4F2B] hover:bg-[#2F6F3B] border border-green-500/50 shadow-lg";
        case "withdraw":
          return "bg-[#5A4014] hover:bg-yellow-700 border border-yellow-600";
        case "loading":
          return "bg-[#2F1746] border border-purple-500 cursor-wait";
        case "start":
        default:
          return "bg-black hover:bg-[#2F1746] border border-purple-500";
      }
    };

    // Get button content based on variant
    const getContent = () => {
      if (isLoading) {
        return (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {typeof children === 'string' ? children : 'Loading...'}
          </span>
        );
      }

      if (variant === "loading") {
        return (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {children}
          </span>
        );
      }

      if (variant === "upgradePending") {
        return (
          <span className="flex items-center gap-2">
            <div className="w-1 h-1 bg-yellow-500 rounded-full animate-ping"></div>
            <span className="text-sm font-semibold text-yellow-400">
              {children || 'Upgrade Pending'}
            </span>
          </span>
        );
      }

      if (variant === "verificationPending") {
        return (
          <span className="flex items-center gap-2">
            <div className="w-1 h-1 bg-yellow-500 rounded-full animate-ping"></div>
            <span className="text-sm font-semibold text-yellow-400">
              {children || 'Verification Pending'}
            </span>
          </span>
        );
      }

      if (variant === "upgrade") {
        return (
          <span className="flex items-center gap-2 font-semibold ps-4">
            {children || 'UPGRADE'}
            <ArrowRight className="w-4 h-4" />
          </span>
        );
      }

      if (variant === "verifyWallet") {
        return (
          <span className="flex items-center gap-2 font-semibold">
            <Wallet className="w-4 h-4" />
            {children || 'Verify Wallet'}
          </span>
        );
      }

      if (variant === "withdraw") {
        return (
          <span className="flex items-center gap-2 font-medium">
            <Wallet className="w-4 h-4" />
            Re-Allocate Funds
          </span>
        );
      }

      return children;
    };

    return (
      <button
        ref={ref}
        className={cn(
          "relative flex cursor-pointer z-[100] items-center justify-center rounded-lg px-6 h-9 text-center text-white font-medium transition-all duration-200",
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
            className="absolute left-1/2 top-1/2 size-full -translate-x-1/2 -translate-y-1/2 rounded-lg animate-pulse"
            style={{
              background: `radial-gradient(circle, ${pulseColor}40 0%, transparent 70%)`,
              animation: `pulse var(--duration) ease-out infinite`,
            }}
          />
        )}
      </button>
    );
  },
);

PulsatingButton.displayName = "PulsatingButton";
