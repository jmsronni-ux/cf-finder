import React from "react";
import { buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ArrowRightIcon, CalendarIcon, SearchIcon, WalletIcon, ShieldIcon } from "lucide-react";
import {Link} from "react-router-dom";
import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Input } from "./input";
import { Integrations } from "./integrations";
import { Label } from "./label";

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const CARDS = [
    {
        Icon: WalletIcon,
        name: "Track Lost Funds",
        description: "Use our advanced tools to locate your lost or inaccessible cryptocurrency.",
        href: "#",
        cta: "Learn more",
        className: "col-span-3 lg:col-span-1",
        background: (
            <Card className="absolute top-10 left-10 origin-top rounded-none rounded-tl-md transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_0%,#000_100%)] group-hover:scale-105 border border-border border-r-0">
                <CardHeader>
                    <CardTitle>
                        Track Your Funds
                    </CardTitle>
                    <CardDescription>
                        {/* Locate your lost or inaccessible cryptocurrency with ease. */}
                    </CardDescription>
                </CardHeader>
                <CardContent className="-mt-4">
                    <Label>
                        Enter Wallet Address
                    </Label>
                    <Input
                        type="text"
                        placeholder="Paste your wallet address..."
                        className="w-full focus-visible:ring-0 focus-visible:ring-transparent"
                    />
                </CardContent>
            </Card>
        ),
    },
    {
        Icon: SearchIcon,
        name: "Search Transactions",
        description: "Quickly find specific transactions or wallet activity with our AI-powered search.",
        href: "#",
        cta: "Learn more",
        className: "col-span-3 lg:col-span-2",
        background: (
            <Command className="absolute right-10 top-10 w-[70%] origin-to translate-x-0 border border-border transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] group-hover:-translate-x-10 p-2">
                <Input placeholder="Search transactions or wallets..." />
                <div className="mt-1 cursor-pointer">
                    <div className="px-4 py-2 hover:bg-muted rounded-md">0x1234...abcd</div>
                    <div className="px-4 py-2 hover:bg-muted rounded-md">0x5678...efgh</div>
                    <div className="px-4 py-2 hover:bg-muted rounded-md">0x9101...ijkl</div>
                    <div className="px-4 py-2 hover:bg-muted rounded-md">0x1121...mnop</div>
                    <div className="px-4 py-2 hover:bg-muted rounded-md">0x3141...qrst</div>
                    <div className="px-4 py-2 hover:bg-muted rounded-md">0x5161...uvwx</div>
                </div>
            </Command>
        ),
    },
    {
        Icon: ShieldIcon,
        name: "Secure Recovery",
        description: "Safely recover your funds with our secure and trusted process.",
        href: "#",
        cta: "Learn more",
        className: "col-span-3 lg:col-span-2 max-w-full overflow-hidden",
        background: (
            <Integrations className="absolute right-2 pl-28 md:pl-0 top-4 h-[300px] w-[600px] border-none transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] group-hover:scale-105" />
        ),
    },
    {
        Icon: CalendarIcon,
        name: "Transaction History",
        description: "View your history with calendar view.",
        className: "col-span-3 lg:col-span-1",
        href: "#",
        cta: "Learn more",
        background: (
            // <Calendar
            //     mode="single"
            //     selected={new Date(2022, 4, 11, 0, 0, 0)}
            //     className="absolute right-0 top-0 origin-top rounded-md border border-border transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] group-hover:scale-105"
            // />
            <img src="/calendar.png" className="w-[17rem] absolute right-0 top-10 origin-top rounded-md border border-border transition-all duration-300 ease-out  group-hover:scale-105"/>
        ),
    },
];

const BentoGrid = ({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) => {
    return (
        <div
            className={cn(
                "grid w-full auto-rows-[22rem] grid-cols-3 gap-4",
                className,
            )}
        >
            {children}
        </div>
    );
};

const BentoCard = ({
    name,
    className,
    background,
    Icon,
    description,
    href,
    cta,
}: {
    name: string;
    className: string;
    background: ReactNode;
    Icon: any;
    description: string;
    href: string;
    cta: string;
}) => (
    <div
        key={name}
        className={cn(
            "group relative col-span-3 flex flex-col justify-between border border-border/60 overflow-hidden rounded-xl",
            "bg-black [box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
            className,
        )}
    >
        <div>{background}</div>
        <div className="pointer-events-none z-10 flex flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-10">
            <Icon className="h-12 w-12 origin-left text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75" />
            <h3 className="text-xl font-semibold text-neutral-300">
                {name}
            </h3>
            <p className="max-w-lg text-neutral-400">{description}</p>
        </div>

        <div
            className={cn(
                "absolute bottom-0 flex w-full translate-y-10 flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100",
            )}
        >
        </div>
        <div className="pointer-events-none absolute inset-0 transition-all duration-300 group-hover:bg-black/[.03] group-hover:dark:bg-neutral-800/10" />
    </div>
);

export { BentoCard, BentoGrid };