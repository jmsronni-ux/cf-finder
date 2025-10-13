"use client";

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import { AnimatedBeam } from "@/components/ui/animated-beam";
import { LucideProps, Search } from "lucide-react";
import React, { forwardRef, useRef } from "react";

const Circle = forwardRef<HTMLDivElement, { className?: string; children?: React.ReactNode }>(
    function Circle({ className, children }, ref) {
        return (
            <div
                ref={ref}
                className={cn(
                    "z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]",
                    className,
                )}
            >
                {children}
            </div>
        );
    }
);

export function Integrations({
    className,
}: {
    className?: string;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const div1Ref = useRef<HTMLDivElement>(null);
    const div2Ref = useRef<HTMLDivElement>(null);
    const div3Ref = useRef<HTMLDivElement>(null);
    const div4Ref = useRef<HTMLDivElement>(null);
    const div5Ref = useRef<HTMLDivElement>(null);
    const div6Ref = useRef<HTMLDivElement>(null);
    const div7Ref = useRef<HTMLDivElement>(null);

    return (
        <div
            className={cn(
                "relative flex w-full max-w-[500px] items-center justify-center overflow-hidden rounded-lg border p-10 md:shadow-xl",
                className,
            )}
            ref={containerRef}
        >
            <div className="flex h-full w-full flex-row items-stretch justify-between gap-10">
                <div className="flex flex-col justify-center">
                    <Circle ref={div7Ref}>
                        <Icons.user className="text-black" />
                    </Circle>
                </div>
                <div className="flex flex-col justify-center">
                    <Circle ref={div6Ref} className="h-16 w-16">
                        <Search className="h-6 w-6 text-black" />
                    </Circle>
                </div>
                <div className="flex flex-col justify-center gap-2">
                    <Circle ref={div1Ref}>
                        <svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="logosBitcoin0" x1="49.973%" x2="49.973%" y1="-.024%" y2="99.99%"><stop offset="0%" stopColor="#F9AA4B"/><stop offset="100%" stopColor="#F7931A"/></linearGradient></defs><path fill="url(#logosBitcoin0)" d="M252.171 158.954c-17.102 68.608-86.613 110.314-155.123 93.211c-68.61-17.102-110.316-86.61-93.213-155.119C20.937 28.438 90.347-13.268 158.957 3.835c68.51 17.002 110.317 86.51 93.214 155.119"/><path fill="#FFF" d="M188.945 112.05c2.5-17-10.4-26.2-28.2-32.3l5.8-23.1l-14-3.5l-5.6 22.5c-3.7-.9-7.5-1.8-11.3-2.6l5.6-22.6l-14-3.5l-5.7 23q-4.65-1.05-9-2.1v-.1l-19.4-4.8l-3.7 15s10.4 2.4 10.2 2.5c5.7 1.4 6.7 5.2 6.5 8.2l-6.6 26.3c.4.1.9.2 1.5.5c-.5-.1-1-.2-1.5-.4l-9.2 36.8c-.7 1.7-2.5 4.3-6.4 3.3c.1.2-10.2-2.5-10.2-2.5l-7 16.1l18.3 4.6c3.4.9 6.7 1.7 10 2.6l-5.8 23.3l14 3.5l5.8-23.1c3.8 1 7.6 2 11.2 2.9l-5.7 23l14 3.5l5.8-23.3c24 4.5 42 2.7 49.5-19c6.1-17.4-.3-27.5-12.9-34.1c9.3-2.1 16.2-8.2 18-20.6m-32.1 45c-4.3 17.4-33.7 8-43.2 5.6l7.7-30.9c9.5 2.4 40.1 7.1 35.5 25.3m4.4-45.3c-4 15.9-28.4 7.8-36.3 5.8l7-28c7.9 2 33.4 5.7 29.3 22.2"/></svg>
                    </Circle>
                    <Circle ref={div2Ref}>
                        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g fill="none" fillRule="evenodd"><circle cx="16" cy="16" r="16" fill="#627EEA"/><g fill="#FFF" fillRule="nonzero"><path fillOpacity=".602" d="M16.498 4v8.87l7.497 3.35z"/><path d="M16.498 4L9 16.22l7.498-3.35z"/><path fillOpacity=".602" d="M16.498 21.968v6.027L24 17.616z"/><path d="M16.498 27.995v-6.028L9 17.616z"/><path fillOpacity=".2" d="m16.498 20.573l7.497-4.353l-7.497-3.348z"/><path fillOpacity=".602" d="m9 16.22l7.498 4.353v-7.701z"/></g></g></svg>
                    </Circle>
                    <Circle ref={div3Ref}>
                        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g fill="none" fillRule="evenodd"><circle cx="16" cy="16" r="16" fill="#26A17B"/><path fill="#FFF" d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042c-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658s2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061c1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658c0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118s3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116s-3.301-1.914-7.694-2.117"/></g></svg>
                    </Circle>
                    <Circle ref={div4Ref}>
                        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g fill="none"><circle cx="16" cy="16" r="16" fill="#F3BA2F"/><path fill="#FFF" d="M12.116 14.404L16 10.52l3.886 3.886l2.26-2.26L16 6l-6.144 6.144zM6 16l2.26-2.26L10.52 16l-2.26 2.26zm6.116 1.596L16 21.48l3.886-3.886l2.26 2.259L16 26l-6.144-6.144l-.003-.003zM21.48 16l2.26-2.26L26 16l-2.26 2.26zm-3.188-.002h.002V16L16 18.294l-2.291-2.29l-.004-.004l.004-.003l.401-.402l.195-.195L16 13.706z"/></g></svg>
                    </Circle>
                    <Circle ref={div5Ref}>
                    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g fill="none" fillRule="evenodd"><circle cx="16" cy="16" r="16" fill="#F60"/><path fill="#FFF" fillRule="nonzero" d="M15.97 5.235c5.985 0 10.825 4.84 10.825 10.824a11 11 0 0 1-.558 3.432h-3.226v-9.094l-7.04 7.04l-7.04-7.04v9.094H5.704a11 11 0 0 1-.557-3.432c0-5.984 4.84-10.824 10.824-10.824zM14.358 19.02L16 20.635l1.613-1.614l3.051-3.08v5.72h4.547a10.8 10.8 0 0 1-9.24 5.192c-3.902 0-7.334-2.082-9.24-5.192h4.546v-5.72l3.08 3.08z"/></g></svg>
                    </Circle>
                </div>
            </div>

            {/* AnimatedBeams */}
            
            <AnimatedBeam
            // @ts-ignore
                containerRef={containerRef}
                // @ts-ignore
                fromRef={div1Ref}
                // @ts-ignore
                toRef={div6Ref}
                duration={3}
            />
            <AnimatedBeam
            // @ts-ignore
                containerRef={containerRef}
                // @ts-ignore
                fromRef={div2Ref}
                // @ts-ignore
                toRef={div6Ref}
                duration={3}
            />
            <AnimatedBeam
            // @ts-ignore
                containerRef={containerRef}
                // @ts-ignore
                fromRef={div3Ref}
                // @ts-ignore
                toRef={div6Ref}
                duration={3}
            />
            <AnimatedBeam
            // @ts-ignore
                containerRef={containerRef}
                // @ts-ignore
                fromRef={div4Ref}
                // @ts-ignore
                toRef={div6Ref}
                duration={3}
            />
            <AnimatedBeam
            // @ts-ignore
                containerRef={containerRef}
                // @ts-ignore
                fromRef={div5Ref}
                // @ts-ignore
                toRef={div6Ref}
                duration={3}
            />
            <AnimatedBeam
            // @ts-ignore
                containerRef={containerRef}
                // @ts-ignore
                fromRef={div6Ref}
                // @ts-ignore
                toRef={div7Ref}
                duration={3}
            />
        </div>
    );
}

const Icons = {
    openai: (props: LucideProps) => (
        <svg role="img" viewBox="0 0 24 24" {...props}>
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
        </svg>
    ),
    user: (props: LucideProps) => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-user"
            {...props}
        >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    ),
    googleDrive: (props: LucideProps) => (
        <svg viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path
                d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
                fill="#0066da"
            />
            <path
                d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"
                fill="#00ac47"
            />
            <path
                d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
                fill="#ea4335"
            />
            <path
                d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
                fill="#00832d"
            />
            <path
                d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
                fill="#2684fc"
            />
            <path
                d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
                fill="#ffba00"
            />
        </svg>
    ),
    googleDocs: (props: LucideProps) => (
        <svg
            width="47px"
            height="65px"
            viewBox="0 0 47 65"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <title>Docs-icon</title>
            <desc>Created with Sketch.</desc>
            <defs>
                <path
                    d="M29.375,0 L4.40625,0 C1.9828125,0 0,1.99431818 0,4.43181818 L0,60.5681818 C0,63.0056818 1.9828125,65 4.40625,65 L42.59375,65 C45.0171875,65 47,63.0056818 47,60.5681818 L47,17.7272727 L29.375,0 Z"
                    id="path-1"
                ></path>
                <path
                    d="M29.375,0 L4.40625,0 C1.9828125,0 0,1.99431818 0,4.43181818 L0,60.5681818 C0,63.0056818 1.9828125,65 4.40625,65 L42.59375,65 C45.0171875,65 47,63.0056818 47,60.5681818 L47,17.7272727 L29.375,0 Z"
                    id="path-3"
                ></path>
                <linearGradient
                    x1="50.0053945%"
                    y1="8.58610612%"
                    x2="50.0053945%"
                    y2="100.013939%"
                    id="linearGradient-5"
                >
                    <stop stopColor="#1A237E" stopOpacity="0.2" offset="0%"></stop>
                    <stop stopColor="#1A237E" stopOpacity="0.02" offset="100%"></stop>
                </linearGradient>
                <path
                    d="M29.375,0 L4.40625,0 C1.9828125,0 0,1.99431818 0,4.43181818 L0,60.5681818 C0,63.0056818 1.9828125,65 4.40625,65 L42.59375,65 C45.0171875,65 47,63.0056818 47,60.5681818 L47,17.7272727 L29.375,0 Z"
                    id="path-6"
                ></path>
                <path
                    d="M29.375,0 L4.40625,0 C1.9828125,0 0,1.99431818 0,4.43181818 L0,60.5681818 C0,63.0056818 1.9828125,65 4.40625,65 L42.59375,65 C45.0171875,65 47,63.0056818 47,60.5681818 L47,17.7272727 L29.375,0 Z"
                    id="path-8"
                ></path>
                <path
                    d="M29.375,0 L4.40625,0 C1.9828125,0 0,1.99431818 0,4.43181818 L0,60.5681818 C0,63.0056818 1.9828125,65 4.40625,65 L42.59375,65 C45.0171875,65 47,63.0056818 47,60.5681818 L47,17.7272727 L29.375,0 Z"
                    id="path-10"
                ></path>
                <path
                    d="M29.375,0 L4.40625,0 C1.9828125,0 0,1.99431818 0,4.43181818 L0,60.5681818 C0,63.0056818 1.9828125,65 4.40625,65 L42.59375,65 C45.0171875,65 47,63.0056818 47,60.5681818 L47,17.7272727 L29.375,0 Z"
                    id="path-12"
                ></path>
                <path
                    d="M29.375,0 L4.40625,0 C1.9828125,0 0,1.99431818 0,4.43181818 L0,60.5681818 C0,63.0056818 1.9828125,65 4.40625,65 L42.59375,65 C45.0171875,65 47,63.0056818 47,60.5681818 L47,17.7272727 L29.375,0 Z"
                    id="path-14"
                ></path>
                <radialGradient
                    cx="3.16804688%"
                    cy="2.71744318%"
                    fx="3.16804688%"
                    fy="2.71744318%"
                    r="161.248516%"
                    gradientTransform="translate(0.031680,0.027174),scale(1.000000,0.723077),translate(-0.031680,-0.027174)"
                    id="radialGradient-16"
                >
                    <stop stopColor="#FFFFFF" stopOpacity="0.1" offset="0%"></stop>
                    <stop stopColor="#FFFFFF" stopOpacity="0" offset="100%"></stop>
                </radialGradient>
            </defs>
            <g
                id="Page-1"
                stroke="none"
                strokeWidth="1"
                fill="none"
                fillRule="evenodd"
            >
                <g
                    id="Consumer-Apps-Docs-Large-VD-R8"
                    transform="translate(-451.000000, -463.000000)"
                >
                    <g id="Hero" transform="translate(0.000000, 63.000000)">
                        <g id="Personal" transform="translate(277.000000, 309.000000)">
                            <g id="Docs-icon" transform="translate(174.000000, 91.000000)">
                                <g id="Group">
                                    <g id="Clipped">
                                        <mask id="mask-2" fill="white">
                                            <use xlinkHref="#path-1"></use>
                                        </mask>
                                        <g id="SVGID_1_"></g>
                                        <path
                                            d="M29.375,0 L4.40625,0 C1.9828125,0 0,1.99431818 0,4.43181818 L0,60.5681818 C0,63.0056818 1.9828125,65 4.40625,65 L42.59375,65 C45.0171875,65 47,63.0056818 47,60.5681818 L47,17.7272727 L36.71875,10.3409091 L29.375,0 Z"
                                            id="Path"
                                            fill="#4285F4"
                                            fillRule="nonzero"
                                            mask="url(#mask-2)"
                                        ></path>
                                    </g>
                                    <g id="Clipped">
                                        <mask id="mask-4" fill="white">
                                            <use xlinkHref="#path-3"></use>
                                        </mask>
                                        <g id="SVGID_1_"></g>
                                        <polygon
                                            id="Path"
                                            fill="url(#linearGradient-5)"
                                            fillRule="nonzero"
                                            mask="url(#mask-4)"
                                            points="30.6638281 16.4309659 47 32.8582386 47 17.7272727"
                                        ></polygon>
                                    </g>
                                    <g id="Clipped">
                                        <mask id="mask-7" fill="white">
                                            <use xlinkHref="#path-6"></use>
                                        </mask>
                                        <g id="SVGID_1_"></g>
                                        <path
                                            d="M11.75,47.2727273 L35.25,47.2727273 L35.25,44.3181818 L11.75,44.3181818 L11.75,47.2727273 Z M11.75,53.1818182 L29.375,53.1818182 L29.375,50.2272727 L11.75,50.2272727 L11.75,53.1818182 Z M11.75,32.5 L11.75,35.4545455 L35.25,35.4545455 L35.25,32.5 L11.75,32.5 Z M11.75,41.3636364 L35.25,41.3636364 L35.25,38.4090909 L11.75,38.4090909 L11.75,41.3636364 Z"
                                            id="Shape"
                                            fill="#F1F1F1"
                                            fillRule="nonzero"
                                            mask="url(#mask-7)"
                                        ></path>
                                    </g>
                                    <g id="Clipped">
                                        <mask id="mask-9" fill="white">
                                            <use xlinkHref="#path-8"></use>
                                        </mask>
                                        <g id="SVGID_1_"></g>
                                        <g id="Group" mask="url(#mask-9)">
                                            <g transform="translate(26.437500, -2.954545)">
                                                <path
                                                    d="M2.9375,2.95454545 L2.9375,16.25 C2.9375,18.6985795 4.90929688,20.6818182 7.34375,20.6818182 L20.5625,20.6818182 L2.9375,2.95454545 Z"
                                                    id="Path"
                                                    fill="#A1C2FA"
                                                    fillRule="nonzero"
                                                ></path>
                                            </g>
                                        </g>
                                    </g>
                                    <g id="Clipped">
                                        <mask id="mask-11" fill="white">
                                            <use xlinkHref="#path-10"></use>
                                        </mask>
                                        <g id="SVGID_1_"></g>
                                        <path
                                            d="M4.40625,0 C1.9828125,0 0,1.99431818 0,4.43181818 L0,4.80113636 C0,2.36363636 1.9828125,0.369318182 4.40625,0.369318182 L29.375,0.369318182 L29.375,0 L4.40625,0 Z"
                                            id="Path"
                                            fillOpacity="0.2"
                                            fill="#FFFFFF"
                                            fillRule="nonzero"
                                            mask="url(#mask-11)"
                                        ></path>
                                    </g>
                                    <g id="Clipped">
                                        <mask id="mask-13" fill="white">
                                            <use xlinkHref="#path-12"></use>
                                        </mask>
                                        <g id="SVGID_1_"></g>
                                        <path
                                            d="M42.59375,64.6306818 L4.40625,64.6306818 C1.9828125,64.6306818 0,62.6363636 0,60.1988636 L0,60.5681818 C0,63.0056818 1.9828125,65 4.40625,65 L42.59375,65 C45.0171875,65 47,63.0056818 47,60.5681818 L47,60.1988636 C47,62.6363636 45.0171875,64.6306818 42.59375,64.6306818 Z"
                                            id="Path"
                                            fillOpacity="0.2"
                                            fill="#1A237E"
                                            fillRule="nonzero"
                                            mask="url(#mask-13)"
                                        ></path>
                                    </g>
                                    <g id="Clipped">
                                        <mask id="mask-15" fill="white">
                                            <use xlinkHref="#path-14"></use>
                                        </mask>
                                        <g id="SVGID_1_"></g>
                                        <path
                                            d="M33.78125,17.7272727 C31.3467969,17.7272727 29.375,15.7440341 29.375,13.2954545 L29.375,13.6647727 C29.375,16.1133523 31.3467969,18.0965909 33.78125,18.0965909 L47,18.0965909 L47,17.7272727 L33.78125,17.7272727 Z"
                                            id="Path"
                                            fillOpacity="0.1"
                                            fill="#1A237E"
                                            fillRule="nonzero"
                                            mask="url(#mask-15)"
                                        ></path>
                                    </g>
                                </g>
                                <path
                                    d="M29.375,0 L4.40625,0 C1.9828125,0 0,1.99431818 0,4.43181818 L0,60.5681818 C0,63.0056818 1.9828125,65 4.40625,65 L42.59375,65 C45.0171875,65 47,63.0056818 47,60.5681818 L47,17.7272727 L29.375,0 Z"
                                    id="Path"
                                    fill="url(#radialGradient-16)"
                                    fillRule="nonzero"
                                ></path>
                            </g>
                        </g>
                    </g>
                </g>
            </g>
        </svg>
    ),
    whatsapp: (props: LucideProps) => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 175.216 175.552"
            {...props}
        >
            <defs>
                <linearGradient
                    id="b"
                    x1="85.915"
                    x2="86.535"
                    y1="32.567"
                    y2="137.092"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset="0" stopColor="#57d163" />
                    <stop offset="1" stopColor="#23b33a" />
                </linearGradient>
                <filter
                    id="a"
                    width="1.115"
                    height="1.114"
                    x="-.057"
                    y="-.057"
                    colorInterpolationFilters="sRGB"
                >
                    <feGaussianBlur stdDeviation="3.531" />
                </filter>
            </defs>
            <path
                fill="#b3b3b3"
                d="m54.532 138.45 2.235 1.324c9.387 5.571 20.15 8.518 31.126 8.523h.023c33.707 0 61.139-27.426 61.153-61.135.006-16.335-6.349-31.696-17.895-43.251A60.75 60.75 0 0 0 87.94 25.983c-33.733 0-61.166 27.423-61.178 61.13a60.98 60.98 0 0 0 9.349 32.535l1.455 2.312-6.179 22.558zm-40.811 23.544L24.16 123.88c-6.438-11.154-9.825-23.808-9.821-36.772.017-40.556 33.021-73.55 73.578-73.55 19.681.01 38.154 7.669 52.047 21.572s21.537 32.383 21.53 52.037c-.018 40.553-33.027 73.553-73.578 73.553h-.032c-12.313-.005-24.412-3.094-35.159-8.954zm0 0"
                filter="url(#a)"
            />
            <path
                fill="#fff"
                d="m12.966 161.238 10.439-38.114a73.42 73.42 0 0 1-9.821-36.772c.017-40.556 33.021-73.55 73.578-73.55 19.681.01 38.154 7.669 52.047 21.572s21.537 32.383 21.53 52.037c-.018 40.553-33.027 73.553-73.578 73.553h-.032c-12.313-.005-24.412-3.094-35.159-8.954z"
            />
            <path
                fill="url(#linearGradient1780)"
                d="M87.184 25.227c-33.733 0-61.166 27.423-61.178 61.13a60.98 60.98 0 0 0 9.349 32.535l1.455 2.312-6.179 22.559 23.146-6.069 2.235 1.324c9.387 5.571 20.15 8.518 31.126 8.524h.023c33.707 0 61.14-27.426 61.153-61.135a60.75 60.75 0 0 0-17.895-43.251 60.75 60.75 0 0 0-43.235-17.929z"
            />
            <path
                fill="url(#b)"
                d="M87.184 25.227c-33.733 0-61.166 27.423-61.178 61.13a60.98 60.98 0 0 0 9.349 32.535l1.455 2.313-6.179 22.558 23.146-6.069 2.235 1.324c9.387 5.571 20.15 8.517 31.126 8.523h.023c33.707 0 61.14-27.426 61.153-61.135a60.75 60.75 0 0 0-17.895-43.251 60.75 60.75 0 0 0-43.235-17.928z"
            />
            <path
                fill="#fff"
                fillRule="evenodd"
                d="M68.772 55.603c-1.378-3.061-2.828-3.123-4.137-3.176l-3.524-.043c-1.226 0-3.218.46-4.902 2.3s-6.435 6.287-6.435 15.332 6.588 17.785 7.506 19.013 12.718 20.381 31.405 27.75c15.529 6.124 18.689 4.906 22.061 4.6s10.877-4.447 12.408-8.74 1.532-7.971 1.073-8.74-1.685-1.226-3.525-2.146-10.877-5.367-12.562-5.981-2.91-.919-4.137.921-4.746 5.979-5.819 7.206-2.144 1.381-3.984.462-7.76-2.861-14.784-9.124c-5.465-4.873-9.154-10.891-10.228-12.73s-.114-2.835.808-3.751c.825-.824 1.838-2.147 2.759-3.22s1.224-1.84 1.836-3.065.307-2.301-.153-3.22-4.032-10.011-5.666-13.647"
            />
        </svg>
    ),
    messenger: (props: LucideProps) => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            x="0px"
            y="0px"
            width="100"
            height="100"
            viewBox="0 0 48 48"
            {...props}
        >
            <radialGradient
                id="8O3wK6b5ASW2Wn6hRCB5xa_YFbzdUk7Q3F8_gr1"
                cx="11.087"
                cy="7.022"
                r="47.612"
                gradientTransform="matrix(1 0 0 -1 0 50)"
                gradientUnits="userSpaceOnUse"
            >
                <stop offset="0" stopColor="#1292ff"></stop>
                <stop offset=".079" stopColor="#2982ff"></stop>
                <stop offset=".23" stopColor="#4e69ff"></stop>
                <stop offset=".351" stopColor="#6559ff"></stop>
                <stop offset=".428" stopColor="#6d53ff"></stop>
                <stop offset=".754" stopColor="#df47aa"></stop>
                <stop offset=".946" stopColor="#ff6257"></stop>
            </radialGradient>
            <path
                fill="url(#8O3wK6b5ASW2Wn6hRCB5xa_YFbzdUk7Q3F8_gr1)"
                d="M44,23.5C44,34.27,35.05,43,24,43c-1.651,0-3.25-0.194-4.784-0.564	c-0.465-0.112-0.951-0.069-1.379,0.145L13.46,44.77C12.33,45.335,11,44.513,11,43.249v-4.025c0-0.575-0.257-1.111-0.681-1.499	C6.425,34.165,4,29.11,4,23.5C4,12.73,12.95,4,24,4S44,12.73,44,23.5z"
            ></path>
            <path
                d="M34.992,17.292c-0.428,0-0.843,0.142-1.2,0.411l-5.694,4.215	c-0.133,0.1-0.28,0.15-0.435,0.15c-0.15,0-0.291-0.047-0.41-0.136l-3.972-2.99c-0.808-0.601-1.76-0.918-2.757-0.918	c-1.576,0-3.025,0.791-3.876,2.116l-1.211,1.891l-4.12,6.695c-0.392,0.614-0.422,1.372-0.071,2.014	c0.358,0.654,1.034,1.06,1.764,1.06c0.428,0,0.843-0.142,1.2-0.411l5.694-4.215c0.133-0.1,0.28-0.15,0.435-0.15	c0.15,0,0.291,0.047,0.41,0.136l3.972,2.99c0.809,0.602,1.76,0.918,2.757,0.918c1.576,0,3.025-0.791,3.876-2.116l1.211-1.891	l4.12-6.695c0.392-0.614,0.422-1.372,0.071-2.014C36.398,17.698,35.722,17.292,34.992,17.292L34.992,17.292z"
                opacity=".05"
            ></path>
            <path
                d="M34.992,17.792c-0.319,0-0.63,0.107-0.899,0.31l-5.697,4.218	c-0.216,0.163-0.468,0.248-0.732,0.248c-0.259,0-0.504-0.082-0.71-0.236l-3.973-2.991c-0.719-0.535-1.568-0.817-2.457-0.817	c-1.405,0-2.696,0.705-3.455,1.887l-1.21,1.891l-4.115,6.688c-0.297,0.465-0.32,1.033-0.058,1.511c0.266,0.486,0.787,0.8,1.325,0.8	c0.319,0,0.63-0.107,0.899-0.31l5.697-4.218c0.216-0.163,0.468-0.248,0.732-0.248c0.259,0,0.504,0.082,0.71,0.236l3.973,2.991	c0.719,0.535,1.568,0.817,2.457,0.817c1.405,0,2.696-0.705,3.455-1.887l1.21-1.891l4.115-6.688c0.297-0.465,0.32-1.033,0.058-1.511	C36.051,18.106,35.531,17.792,34.992,17.792L34.992,17.792z"
                opacity=".07"
            ></path>
            <path
                fill="#fff"
                d="M34.394,18.501l-5.7,4.22c-0.61,0.46-1.44,0.46-2.04,0.01L22.68,19.74	c-1.68-1.25-4.06-0.82-5.19,0.94l-1.21,1.89l-4.11,6.68c-0.6,0.94,0.55,2.01,1.44,1.34l5.7-4.22c0.61-0.46,1.44-0.46,2.04-0.01	l3.974,2.991c1.68,1.25,4.06,0.82,5.19-0.94l1.21-1.89l4.11-6.68C36.434,18.901,35.284,17.831,34.394,18.501z"
            ></path>
        </svg>
    ),
    notion: (props: LucideProps) => (
        <svg
            width="100"
            height="100"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path
                d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z"
                fill="#fff"
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917zM25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 1.557 -1.947l53.193 -3.887c4.467 -0.39 6.793 1.167 8.54 2.527l9.123 6.61c0.39 0.197 1.36 1.36 0.193 1.36l-54.933 3.307 -0.68 0.047zM19.803 88.3V30.367c0 -2.53 0.777 -3.697 3.103 -3.893L86 22.78c2.14 -0.193 3.107 1.167 3.107 3.693v57.547c0 2.53 -0.39 4.67 -3.883 4.863l-60.377 3.5c-3.493 0.193 -5.043 -0.97 -5.043 -4.083zm59.6 -54.827c0.387 1.75 0 3.5 -1.75 3.7l-2.91 0.577v42.773c-2.527 1.36 -4.853 2.137 -6.797 2.137 -3.107 0 -3.883 -0.973 -6.21 -3.887l-19.03 -29.94v28.967l6.02 1.363s0 3.5 -4.857 3.5l-13.39 0.777c-0.39 -0.78 0 -2.723 1.357 -3.11l3.497 -0.97v-38.3L30.48 40.667c-0.39 -1.75 0.58 -4.277 3.3 -4.473l14.367 -0.967 19.8 30.327v-26.83l-5.047 -0.58c-0.39 -2.143 1.163 -3.7 3.103 -3.89l13.4 -0.78z"
                fill="#000"
            />
        </svg>
    ),
};
