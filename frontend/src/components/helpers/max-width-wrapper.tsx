
import React from 'react';

interface Props {
    className?: string;
    children: React.ReactNode;
}

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


const MaxWidthWrapper = ({ className, children }: Props) => {
    return (
        <section className={cn(
            "h-full mx-auto w-full max-w-full md:max-w-screen-xl px-4 md:px-12 lg:px-20",
            className,
        )}>
            {children}
        </section>
    )
};

export default MaxWidthWrapper