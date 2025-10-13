import { ComponentPropsWithoutRef, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import React from "react"

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number
  startValue?: number
  direction?: "up" | "down"
  delay?: number
  decimalPlaces?: number
}

export function NumberTicker({
  value,
  startValue = 0,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [displayValue, setDisplayValue] = useState(startValue)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    if (!ref.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(ref.current)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isInView) return

    const timeout = setTimeout(() => {
      const duration = 2000 // 2 seconds
      const steps = 60
      const increment = (value - startValue) / steps
      let currentStep = 0

      const timer = setInterval(() => {
        currentStep++
        if (currentStep <= steps) {
          const newValue = startValue + increment * currentStep
          setDisplayValue(newValue)
        } else {
          setDisplayValue(value)
          clearInterval(timer)
        }
      }, duration / steps)

      return () => clearInterval(timer)
    }, delay * 1000)

    return () => clearTimeout(timeout)
  }, [isInView, value, startValue, delay])

  const formattedValue = Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(Number(displayValue.toFixed(decimalPlaces)))

  return (
    <span
      ref={ref}
      className={cn(
        "inline-block tracking-wider text-black tabular-nums dark:text-white",
        className
      )}
      {...props}
    >
      {formattedValue}
    </span>
  )
}
