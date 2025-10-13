import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { CheckCircleIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from 'react';
import React from "react";

type Tab = "monthly" | "yearly";

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


const PLANS = [
    {
        name: "Individual",
        info: "For individuals looking to recover lost crypto funds.",
        price: {
            monthly: "Free",
            yearly: "Free",
        },
        features: [
            {
                text: "Free consultation with an expert",
                tooltip: "Our team will guide you through the recovery process.",
            },
            {
                text: "Wallet analysis and fund tracking",
                tooltip: "We analyze your wallet to locate lost funds.",
            },
            {
                text: "Basic recovery support",
                tooltip: "Assistance with recovering small amounts of crypto.",
            },
            {
                text: "Email and chat support",
                tooltip: "Get help via email or chat during business hours.",
            },
        ],
        btn: {
            text: "Get Started",
            href: "/login",
        },
    },
    {
        name: "Business",
        info: "For companies with large-scale crypto recovery needs.",
        price: {
            monthly: "$499",
            yearly: "$4,788",
        },
        features: [
            {
                text: "Dedicated recovery specialist",
                tooltip: "A dedicated expert will handle your case.",
            },
            {
                text: "Advanced wallet and blockchain analysis",
                tooltip: "In-depth analysis to locate and recover funds.",
            },
            {
                text: "Priority 24/7 support",
                tooltip: "Round-the-clock support for urgent cases.",
            },
            {
                text: "Custom recovery solutions",
                tooltip: "Tailored solutions for complex recovery scenarios.",
            },
            {
                text: "Detailed recovery reports",
                tooltip: "Comprehensive reports on recovery progress.",
            },
        ],
        btn: {
            text: "Contact Sales",
            href: "/login",
        },
    },
    {
        name: "Enterprise",
        info: "For enterprises with high-volume or complex recovery needs.",
        price: {
            monthly: "Custom",
            yearly: "Custom",
        },
        features: [
            {
                text: "Dedicated recovery team",
                tooltip: "A full team assigned to your recovery case.",
            },
            {
                text: "Enterprise-grade security",
                tooltip: "Advanced security measures for sensitive data.",
            },
            {
                text: "Custom SLAs and guarantees",
                tooltip: "Service-level agreements tailored to your needs.",
            },
            {
                text: "Blockchain forensic analysis",
                tooltip: "Advanced forensic tools for complex cases.",
            },
            {
                text: "API integration and automation",
                tooltip: "Integrate our tools into your existing systems.",
            },
        ],
        btn: {
            text: "Request a Demo",
            href: "/login",
        },
    },
];

const PricingCards = () => {
    const [activeTab, setActiveTab] = useState<Tab>("monthly");

    const MotionTabTrigger = motion(TabsTrigger);

    return (
        <Tabs defaultValue="monthly" className="w-full flex flex-col items-center justify-center">
            <TabsList>
                <MotionTabTrigger
                    value="monthly"
                    onClick={() => setActiveTab("monthly")}
                    className="relative"
                >
                    {activeTab === "monthly" && (
                        <motion.div
                            layoutId="active-tab-indicator"
                            transition={{
                                type: "spring",
                                bounce: 0.5,
                            }}
                            className="absolute top-0 left-0 w-full h-full bg-background shadow-sm rounded-md z-10"
                        />
                    )}
                    <span className="z-20">
                        Monthly
                    </span>
                </MotionTabTrigger>
                <MotionTabTrigger
                    value="yearly"
                    onClick={() => setActiveTab("yearly")}
                    className="relative"
                >
                    {activeTab === "yearly" && (
                        <motion.div
                            layoutId="active-tab-indicator"
                            transition={{
                                type: "spring",
                                bounce: 0.5,
                            }}
                            className="absolute top-0 left-0 w-full h-full bg-background shadow-sm rounded-md z-10"
                        />
                    )}
                    <span className="z-20">
                        Yearly
                    </span>
                </MotionTabTrigger>
            </TabsList>

            <TabsContent value="monthly" className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-full md:gap-8 flex-wrap max-w-5xl mx-auto pt-6">
                {PLANS.map((plan) => (
                    <Card
                        key={plan.name}
                        className={cn(
                            "flex flex-col w-full border-border rounded-xl",
                            plan.name === "Business" && "border-2 border-purple-500"
                        )}
                    >
                        <CardHeader className={cn(
                            "border-b border-border",
                            plan.name === "Business" ? "bg-purple-500/[0.07]" : "bg-foreground/[0.03]"
                        )}>
                            <CardTitle className={cn(plan.name !== "Business" && "text-muted-foreground", "text-lg font-medium")}>
                                {plan.name}
                            </CardTitle>
                            <CardDescription>
                                {plan.info}
                            </CardDescription>
                            <h5 className="text-3xl font-semibold mt-[5rem]">
                                {plan.price.monthly}
                                <span className="text-base text-muted-foreground font-normal">
                                    {plan.name !== "Individual" && plan.price.monthly !== "Custom" ? "/month" : ""}
                                </span>
                            </h5>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            {plan.features.map((feature, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <CheckCircleIcon className="text-purple-500 w-4 h-4" />
                                    <TooltipProvider>
                                        <Tooltip delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                <p className={cn(feature.tooltip && "border-b !border-dashed border-border cursor-pointer")}>
                                                    {feature.text}
                                                </p>
                                            </TooltipTrigger>
                                            {feature.tooltip && (
                                                <TooltipContent>
                                                    <p>{feature.tooltip}</p>
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            ))}
                        </CardContent>
                        <CardFooter className="w-full mt-auto">
                            <Link
                                to={plan.btn.href}
                                style={{ width: "100%" }}
                                className={buttonVariants({ className: plan.name === "Business" && "bg-purple-500 hover:bg-purple-500/80 text-white" })}
                            >
                                {plan.btn.text}
                            </Link>
                        </CardFooter>
                    </Card>
                ))}
            </TabsContent>
            <TabsContent value="yearly" className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-full md:gap-8 flex-wrap max-w-5xl mx-auto pt-6">
                {PLANS.map((plan) => (
                    <Card
                        key={plan.name}
                        className={cn(
                            "flex flex-col w-full border-border rounded-xl",
                            plan.name === "Business" && "border-2 border-purple-500"
                        )}
                    >
                        <CardHeader className={cn(
                            "border-b border-border",
                            plan.name === "Business" ? "bg-purple-500/[0.07]" : "bg-foreground/[0.03]"
                        )}>
                            <CardTitle className={cn(plan.name !== "Business" && "text-muted-foreground", "text-lg font-medium")}>
                                {plan.name}
                            </CardTitle>
                            <CardDescription>
                                {plan.info}
                            </CardDescription>
                            <h5 className="text-3xl font-semibold flex items-end">
                                {plan.price.yearly}
                                <div className="text-base text-muted-foreground font-normal">
                                    {plan.name !== "Individual" && plan.price.yearly !== "Custom" ? "/year" : ""}
                                </div>
                                {plan.name !== "Individual" && plan.price.yearly !== "Custom" && (
                                    <motion.span
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        transition={{ duration: 0.3, type: "spring", bounce: 0.25 }}
                                        className="px-2 py-0.5 ml-2 rounded-md bg-purple-500 text-foreground text-sm font-medium"
                                    >
                                        -12%
                                    </motion.span>
                                )}
                            </h5>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            {plan.features.map((feature, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <CheckCircleIcon className="text-purple-500 w-4 h-4" />
                                    <TooltipProvider>
                                        <Tooltip delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                <p className={cn(feature.tooltip && "border-b !border-dashed border-border cursor-pointer")}>
                                                    {feature.text}
                                                </p>
                                            </TooltipTrigger>
                                            {feature.tooltip && (
                                                <TooltipContent>
                                                    <p>{feature.tooltip}</p>
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            ))}
                        </CardContent>
                        <CardFooter className="w-full mt-auto">
                            <Link
                                to={plan.btn.href}
                                style={{ width: "100%" }}
                                className={buttonVariants({ className: plan.name === "Business" && "bg-purple-500 hover:bg-purple-500/80 text-white" })}
                            >
                                {plan.btn.text}
                            </Link>
                        </CardFooter>
                    </Card>
                ))}
            </TabsContent>
        </Tabs>
    )
};

export default PricingCards;