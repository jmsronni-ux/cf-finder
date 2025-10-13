"use client";

import { Button, buttonVariants } from "@/components/ui/button";
// import { useAuth } from "@clerk/nextjs";
import { LucideIcon, ZapIcon } from "lucide-react";
import {Link} from "react-router-dom";
import React, { useState } from 'react';
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
const MobileNavbar = () => {

    // const { isSignedIn, signOut } = useAuth();

    const [isOpen, setIsOpen] = useState<boolean>(false);

    const handleClose = () => {
        setIsOpen(false);
    };

    return (
        <div className="flex lg:hidden items-center justify-end">
            <div className="flex items-center gap-x-4">

                <Link to="/login" className={buttonVariants({ size: "sm", })}>
                    Login
                    <ZapIcon className="size-3.5 ml-1.5 text-orange-500 fill-orange-500" />
                </Link>
            </div>
        </div>
    )
};

const ListItem = React.forwardRef<
    React.ElementRef<"a">,
    React.ComponentPropsWithoutRef<"a"> & { title: string; icon: LucideIcon }
>(({ className, title, href, icon: Icon, children, ...props }, ref) => {
    return (
        <li>
            <Link
                to={href!}
                ref={ref}
                className={cn(
                    "block select-none space-y-1 rounded-lg p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    className
                )}
                {...props}
            >
                <div className="flex items-center space-x-2 text-foreground">
                    <Icon className="h-4 w-4" />
                    <h6 className="text-sm !leading-none">
                        {title}
                    </h6>
                </div>
                <p title={children! as string} className="line-clamp-1 text-sm leading-snug text-muted-foreground">
                    {children}
                </p>
            </Link>
        </li>
    )
})
ListItem.displayName = "ListItem"

export default MobileNavbar
