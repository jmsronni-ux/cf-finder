import React from "react";
// import { AnimationContainer, MaxWidthWrapper, PricingCards } from "@/components";
import  AnimationContainer  from "@/components/helpers/animation-container";
import  MaxWidthWrapper from "@/components/helpers/max-width-wrapper";
import PricingCards from "@/components/pricing-cards";
import { BentoCard, BentoGrid, CARDS } from "@/components/ui/bento-grid";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LampContainer } from "@/components/ui/lamp";
import MagicBadge from "@/components/ui/magic-badge";
import MagicCard from "@/components/ui/magic-card";
import { REVIEWS } from "@/utils/constants/misc";
import { ArrowRightIcon, CreditCardIcon, StarIcon } from "lucide-react";
import { DEFAULT_AVATAR_URL, PAGINATION_LIMIT, COMPANIES, PROCESS } from "../utils/constants/misc";
import { Link } from "react-router-dom";
import Navbar from "@/components/navigation/navbar";
import Footer from "@/components/navigation/footer";

const HomePage = () => {

    // const user = await currentUser();

    return (
        <>
        <div id="home" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-25 h-full" />
        <Navbar />
        <div className="overflow-x-hidden scrollbar-hide size-full mt-20">
            {/* Hero Section */}
            <MaxWidthWrapper>
                <div className="flex flex-col items-center justify-center w-full text-center bg-gradient-to-t from-background">
                    <AnimationContainer className="flex flex-col items-center justify-center w-full text-center">
                        <button className="group relative grid overflow-hidden rounded-full px-4 py-1 shadow-[0_1000px_0_0_hsl(0_0%_20%)_inset] transition-colors duration-200">
                            <span>
                                <span className="spark mask-gradient absolute inset-0 h-[100%] w-[100%] animate-flip overflow-hidden rounded-full [mask:linear-gradient(white,_transparent_50%)] before:absolute before:aspect-square before:w-[200%] before:rotate-[-90deg] before:animate-rotate before:bg-[conic-gradient(from_0deg,transparent_0_340deg,white_360deg)] before:content-[''] before:[inset:0_auto_auto_50%] before:[translate:-50%_-15%]" />
                            </span>
                            <span className="backdrop absolute inset-[1px] rounded-full bg-neutral-950 transition-colors duration-200 group-hover:bg-neutral-900" />
                            <span className="h-full w-full blur-md absolute bottom-0 inset-x-0 bg-gradient-to-tr from-primary/20"></span>
                            <Link to="/login" className="z-10 py-0.5 text-sm text-neutral-100 flex items-center justify-center gap-1">
                                ✨ AI Driven Blockchain Investigator
                                <ArrowRightIcon className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
                            </Link>
                        </button>
                        <h1 className="text-foreground text-center py-6 text-5xl font-medium tracking-normal text-balance sm:text-6xl md:text-7xl lg:text-8xl !leading-[1.15] w-full font-heading">
                        Legally yours. Technically yours. <span className="text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text inline-bloc">
                        Still yours!
                            </span>
                        </h1>
                        <p className="mb-12 text-lg tracking-tight text-muted-foreground md:text-xl text-balance">
                        Advanced blockchain forensics built to trace verified assets and restore rightful ownership.
                            <br className="hidden md:block" />
                            <span className="hidden md:block">Track, recover, and secure your funds with ease.</span>
                        </p>
                        <div className="flex items-center justify-center whitespace-nowrap gap-4 z-50">
                            <Button asChild>
                                <Link to={"/login"} className="flex items-center">
                                Start My Verification
                                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                                </Link>
                            </Button>
                        </div>
                    </AnimationContainer>

                    <AnimationContainer delay={0.2} className="relative pt-20 pb-20 md:py-32 px-2 bg-transparent w-full">
                        <div className="absolute md:top-[10%] left-1/2 gradient w-3/4 -translate-x-1/2 h-1/4 md:h-1/3 inset-0 blur-[5rem] animate-image-glow"></div>
                        <div className="-m-2 rounded-xl p-2 ring-1 ring-inset ring-foreground/20 lg:-m-4 lg:rounded-2xl bg-opacity-50 backdrop-blur-3xl">
                            <BorderBeam
                                size={250}
                                duration={12}
                                delay={9}
                            />
                            <img
                                src="/assets/dash.png"
                                alt="Dashboard"
                                width={1200}
                                height={1200}
                                className="rounded-md lg:rounded-xl bg-foreground/10 ring-1 ring-border"
                            />
                            <div className="absolute -bottom-4 inset-x-0 w-full h-1/2 bg-gradient-to-t from-background z-40"></div>
                            <div className="absolute bottom-0 md:-bottom-8 inset-x-0 w-full h-1/4 bg-gradient-to-t from-background z-50"></div>
                        </div>
                    </AnimationContainer>
                </div>
            </MaxWidthWrapper >

            {/* How It Works Section */}
            <MaxWidthWrapper className="py-10">
                <AnimationContainer delay={0.1}>
                    <div className="flex flex-col items-center lg:items-center justify-center w-full py-8 max-w-xl mx-auto">
                        <MagicBadge title="How it works" />
                        <h2 className="text-center lg:text-center text-3xl md:text-5xl !leading-[1.1] font-medium font-heading text-foreground mt-6">
                            Your Path to Asset Recovery
                        </h2>
                        <p className="mt-4 text-center lg:text-center text-lg text-muted-foreground max-w-lg">
                            A secure, transparent process that verifies your identity and reconnects you with your blockchain assets.
                        </p>
                    </div>
                </AnimationContainer>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full py-8 gap-4 md:gap-8">
                    <AnimationContainer delay={0.2}>
                        <MagicCard className="group md:py-8">
                            <div className="flex flex-col items-start justify-center w-full">
                                <div className="flex flex-col relative items-start">
                                    <span className="absolute -top-6 right-0 border-2 border-border text-foreground font-medium text-2xl rounded-full w-12 h-12 flex items-center justify-center pt-0.5">
                                        1
                                    </span>
                                    <h3 className="text-base mt-6 font-medium text-foreground">
                                        Identity & Ownership Verification
                                    </h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        The process begins by confirming that the wallet truly belongs to you. You'll complete a small, system-generated network validation transaction — a digital handshake that proves wallet control without any payment or commitment. This securely links your verified identity with your active wallet and activates your personal recovery environment.
                                    </p>
                                </div>
                            </div>
                        </MagicCard>
                    </AnimationContainer>
                    <AnimationContainer delay={0.4}>
                        <MagicCard className="group md:py-8">
                            <div className="flex flex-col items-start justify-center w-full">
                                <div className="flex flex-col relative items-start">
                                    <span className="absolute -top-6 right-0 border-2 border-border text-foreground font-medium text-2xl rounded-full w-12 h-12 flex items-center justify-center pt-0.5">
                                        2
                                    </span>
                                    <h3 className="text-base mt-6 font-medium text-foreground">
                                        Activation & Analysis
                                    </h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Once verified, your account is activated. Our tracing system begins analyzing historic blockchain records connected to your verified identity, identifying transactions that may still be traceable to you. Through advanced pattern-matching and forensic mapping, the system detects activity tied to your original exchange purchases.
                                    </p>
                                </div>
                            </div>
                        </MagicCard>
                    </AnimationContainer>
                    <AnimationContainer delay={0.6}>
                        <MagicCard className="group md:py-8">
                            <div className="flex flex-col items-start justify-center w-full">
                                <div className="flex flex-col relative items-start">
                                    <span className="absolute -top-6 right-0 border-2 border-border text-foreground font-medium text-2xl rounded-full w-12 h-12 flex items-center justify-center pt-0.5">
                                        3
                                    </span>
                                    <h3 className="text-base mt-6 font-medium text-foreground">
                                        Asset re-allocation
                                    </h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        With a single click, the system begins reconnecting your verified wallet to its past blockchain trails. When a valid match is confirmed, the corresponding amount is automatically reflected in your wallet balance. Each successful result unlocks the next stage, allowing deeper analysis and additional recoverable amounts to surface.
                                    </p>
                                </div>
                            </div>
                        </MagicCard>
                    </AnimationContainer>
                </div>
            </MaxWidthWrapper>

            {/* Companies Section */}
            <MaxWidthWrapper>
                <AnimationContainer delay={0.4}>
                    <div className="py-14">
                        <div className="mx-auto px-4 md:px-8">
                            <h2 className="text-center text-sm font-medium font-heading text-neutral-400 uppercase">
                                Trusted by the best in the industry
                            </h2>
                            <div className="mt-8">
                                <ul className="flex flex-wrap items-center gap-x-6 gap-y-6 md:gap-x-16 justify-center">
                                    {COMPANIES.map((company) => (
                                        <li key={company.name}>
                                            <img
                                                src={company.logo}
                                                alt={company.name}
                                                width={80}
                                                height={80}
                                                className="w-28 h-auto"
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </AnimationContainer>
            </MaxWidthWrapper>

            {/* Features Section */}
            <MaxWidthWrapper className="pt-10">
                <AnimationContainer delay={0.1}>
                    <div className="flex flex-col w-full items-center lg:items-center justify-center py-8">
                        <MagicBadge title="Features" />
                        <h2 className="text-center lg:text-center text-3xl md:text-5xl !leading-[1.1] font-medium font-heading text-foreground mt-6">
                            Recover Your Crypto with Confidence
                        </h2>
                        <p className="mt-4 text-center lg:text-center text-lg text-muted-foreground max-w-lg">
                            Our platform offers advanced tools to help you track, recover, and secure your lost cryptocurrency funds.
                        </p>
                    </div>
                </AnimationContainer>
                <AnimationContainer delay={0.2}>
                    <BentoGrid className="py-8 ">
                        {CARDS.map((feature, idx) => (
                            <BentoCard key={idx} {...feature} />
                        ))}
                    </BentoGrid>
                </AnimationContainer>
            </MaxWidthWrapper>

            {/* Process Section */}
            <MaxWidthWrapper className="py-10">
                <AnimationContainer delay={0.1}>
                    <div className="flex flex-col items-center lg:items-center justify-center w-full py-8 max-w-xl mx-auto">
                        <MagicBadge title="The Process" />
                        <h2 className="text-center lg:text-center text-3xl md:text-5xl !leading-[1.1] font-medium font-heading text-foreground mt-6">
                            Recover Your Lost Crypto in 3 Simple Steps
                        </h2>
                        <p className="mt-4 text-center lg:text-center text-lg text-muted-foreground max-w-lg">
                            Follow these steps to track, recover, and secure your lost cryptocurrency funds with ease.
                        </p>
                    </div>
                </AnimationContainer>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full py-8 gap-4 md:gap-8">
                    {PROCESS.map((process, id) => (
                        <AnimationContainer delay={0.2 * id} key={id}>
                            <MagicCard className="group md:py-8">
                                <div className="flex flex-col items-start justify-center w-full">
                                    <process.icon strokeWidth={1.5} className="w-10 h-10 text-foreground" />
                                    <div className="flex flex-col relative items-start">
                                        <span className="absolute -top-6 right-0 border-2 border-border text-foreground font-medium text-2xl rounded-full w-12 h-12 flex items-center justify-center pt-0.5">
                                            {id + 1}
                                        </span>
                                        <h3 className="text-base mt-6 font-medium text-foreground">
                                            {process.title}
                                        </h3>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {process.description}
                                        </p>
                                    </div>
                                </div>
                            </MagicCard>
                        </AnimationContainer>
                    ))}
                </div>
            </MaxWidthWrapper>

            {/* Pricing Section - Hidden for now */}
            {/* <MaxWidthWrapper className="py-10">
                <AnimationContainer delay={0.1}>
                    <div className="flex flex-col items-center lg:items-center justify-center w-full py-8 max-w-xl mx-auto">
                        <MagicBadge title="Simple Pricing" />
                        <h2 className="text-center lg:text-center text-3xl md:text-5xl !leading-[1.1] font-medium font-heading text-foreground mt-6">
                            Free for Individuals, Premium for Businesses
                        </h2>
                        <p className="mt-4 text-center lg:text-center text-lg text-muted-foreground max-w-lg">
                            Individuals get free support, while businesses and enterprises enjoy advanced tools and dedicated assistance.
                        </p>
                    </div>
                </AnimationContainer>
                <AnimationContainer delay={0.2}>
                    <PricingCards />
                </AnimationContainer>
                <AnimationContainer delay={0.3}>
                    <div className="flex flex-wrap items-start md:items-center justify-center lg:justify-evenly gap-6 mt-12 max-w-5xl mx-auto w-full">
                        <div className="flex items-center gap-2">
                            <CreditCardIcon className="w-5 h-5 text-foreground" />
                            <span className="text-muted-foreground">
                                No credit card required
                            </span>
                        </div>
                    </div>
                </AnimationContainer>
            </MaxWidthWrapper> */}

            {/* Why It Works Section */}
            <MaxWidthWrapper className="py-10">
                <AnimationContainer delay={0.1}>
                    <div className="flex flex-col items-center lg:items-center justify-center w-full py-8 max-w-xl mx-auto">
                        <MagicBadge title="Why It Works" />
                        <h2 className="text-center lg:text-center text-3xl md:text-5xl !leading-[1.1] font-medium font-heading text-foreground mt-6">
                            Built on Blockchain Truth
                        </h2>
                        <p className="mt-4 text-center lg:text-center text-lg text-muted-foreground max-w-2xl">
                            You followed every rule when you bought your crypto — the blockchain still remembers that.
                        </p>
                    </div>
                </AnimationContainer>
                <div className="grid grid-cols-1 md:grid-cols-3 w-full py-8 gap-4 md:gap-8">
                    <AnimationContainer delay={0.2}>
                        <MagicCard className="group md:py-8">
                            <div className="flex flex-col items-start justify-center w-full h-full">
                                <div className="flex flex-col relative items-start">
                                    <h3 className="text-base font-medium text-foreground">
                                        Identity-Linked Transactions
                                    </h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Your original crypto purchases were verified under your government ID (KYC), permanently linking those assets to your identity.
                                    </p>
                                </div>
                            </div>
                        </MagicCard>
                    </AnimationContainer>
                    <AnimationContainer delay={0.3}>
                        <MagicCard className="group md:py-8">
                            <div className="flex flex-col items-start justify-center w-full h-full">
                                <div className="flex flex-col relative items-start">
                                    <h3 className="text-base font-medium text-foreground">
                                        Forensic Blockchain Analysis
                                    </h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Our algorithm tracks that identity trail across the blockchain to locate associated funds.
                                    </p>
                                </div>
                            </div>
                        </MagicCard>
                    </AnimationContainer>
                    <AnimationContainer delay={0.4}>
                        <MagicCard className="group md:py-8">
                            <div className="flex flex-col items-start justify-center w-full h-full">
                                <div className="flex flex-col relative items-start">
                                    <h3 className="text-base font-medium text-foreground">
                                        Blockchain Re-Allocation
                                    </h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Once confirmed, the system initiates a smart transaction that reconnects those assets to your current verified wallet.
                                    </p>
                                </div>
                            </div>
                        </MagicCard>
                    </AnimationContainer>
                </div>
            </MaxWidthWrapper>

            {/* The Process Section */}
            <MaxWidthWrapper className="py-10">
                <AnimationContainer delay={0.1}>
                    <div className="flex flex-col items-center lg:items-center justify-center w-full py-8 max-w-3xl mx-auto">
                        <MagicBadge title="The Process" />
                        <h2 className="text-center lg:text-center text-3xl md:text-5xl !leading-[1.1] font-medium font-heading text-foreground mt-6">
                            Forensic Recovery Cycles
                        </h2>
                        <p className="mt-6 text-center lg:text-center text-base text-muted-foreground max-w-3xl leading-relaxed">
                            Each stage functions as a forensic recovery cycle. A brief verification action within the blockchain validates your ownership signature and enables the system to cross-match data. When a transaction is confirmed as yours, the system re-allocates the associated value to your current wallet.
                        </p>
                        <p className="mt-4 text-center lg:text-center text-base text-muted-foreground max-w-3xl leading-relaxed">
                            This process operates entirely on-chain, creating transparent, traceable operations and verifiable results.
                        </p>
                    </div>
                </AnimationContainer>
            </MaxWidthWrapper>

            {/* The Experience Section */}
            <MaxWidthWrapper className="py-10">
                <AnimationContainer delay={0.1}>
                    <div className="flex flex-col items-center lg:items-center justify-center w-full py-8 max-w-3xl mx-auto">
                        <MagicBadge title="The Experience" />
                        <h2 className="text-center lg:text-center text-3xl md:text-5xl !leading-[1.1] font-medium font-heading text-foreground mt-6">
                            Precision-Built Dashboard
                        </h2>
                        <p className="mt-6 text-center lg:text-center text-base text-muted-foreground max-w-3xl leading-relaxed">
                            Your dashboard is powered by a precision-built Blockchain Retrieval Engine — designed to make complex tracing feel intuitive. Each operation represents a real blockchain verification, displayed with live progress indicators.
                        </p>
                        <p className="mt-4 text-center lg:text-center text-base text-muted-foreground max-w-3xl leading-relaxed">
                            It feels interactive and engaging, yet every result is based on verified data — not chance, not guesswork.
                        </p>
                    </div>
                </AnimationContainer>
            </MaxWidthWrapper>

            {/* Reviews Section */}
            <MaxWidthWrapper className="py-10">
                <AnimationContainer delay={0.1}>
                    <div className="flex flex-col items-center lg:items-center justify-center w-full py-8 max-w-xl mx-auto">
                        <MagicBadge title="Our Customers" />
                        <h2 className="text-center lg:text-center text-3xl md:text-5xl !leading-[1.1] font-medium font-heading text-foreground mt-6">
                            What our users are saying
                        </h2>
                        <p className="mt-4 text-center lg:text-center text-lg text-muted-foreground max-w-lg">
                            Here&apos;s what some of our users have to say about Linkify.
                        </p>
                    </div>
                </AnimationContainer>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 place-items-start gap-4 md:gap-8 py-10">
                    <div className="flex flex-col items-start h-min gap-6">
                        {REVIEWS.slice(0, 3).map((review, index) => (
                            <AnimationContainer delay={0.2 * index} key={index}>
                                <MagicCard key={index} className="md:p-0">
                                    <Card className="flex flex-col w-full border-none h-min">
                                        <CardHeader className="space-y-0">
                                            <CardTitle className="text-lg font-medium text-muted-foreground">
                                                {review.name}
                                            </CardTitle>
                                            <CardDescription>
                                                {review.username}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4 pb-4">
                                            <p className="text-muted-foreground">
                                                {review.review}
                                            </p>
                                        </CardContent>
                                        <CardFooter className="w-full space-x-1 mt-auto">
                                            {Array.from({ length: review.rating }, (_, i) => (
                                                <StarIcon key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                                            ))}
                                        </CardFooter>
                                    </Card>
                                </MagicCard>
                            </AnimationContainer>
                        ))}
                    </div>
                    <div className="flex flex-col items-start h-min gap-6">
                        {REVIEWS.slice(3, 6).map((review, index) => (
                            <AnimationContainer delay={0.2 * index} key={index}>
                                <MagicCard key={index} className="md:p-0">
                                    <Card className="flex flex-col w-full border-none h-min">
                                        <CardHeader className="space-y-0">
                                            <CardTitle className="text-lg font-medium text-muted-foreground">
                                                {review.name}
                                            </CardTitle>
                                            <CardDescription>
                                                {review.username}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4 pb-4">
                                            <p className="text-muted-foreground">
                                                {review.review}
                                            </p>
                                        </CardContent>
                                        <CardFooter className="w-full space-x-1 mt-auto">
                                            {Array.from({ length: review.rating }, (_, i) => (
                                                <StarIcon key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                                            ))}
                                        </CardFooter>
                                    </Card>
                                </MagicCard>
                            </AnimationContainer>
                        ))}
                    </div>
                    <div className="flex flex-col items-start h-min gap-6">
                        {REVIEWS.slice(6, 9).map((review, index) => (
                            <AnimationContainer delay={0.2 * index} key={index}>
                                <MagicCard key={index} className="md:p-0">
                                    <Card className="flex flex-col w-full border-none h-min">
                                        <CardHeader className="space-y-0">
                                            <CardTitle className="text-lg font-medium text-muted-foreground">
                                                {review.name}
                                            </CardTitle>
                                            <CardDescription>
                                                {review.username}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4 pb-4">
                                            <p className="text-muted-foreground">
                                                {review.review}
                                            </p>
                                        </CardContent>
                                        <CardFooter className="w-full space-x-1 mt-auto">
                                            {Array.from({ length: review.rating }, (_, i) => (
                                                <StarIcon key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                                            ))}
                                        </CardFooter>
                                    </Card>
                                </MagicCard>
                            </AnimationContainer>
                        ))}
                    </div>
                </div>
            </MaxWidthWrapper>

            {/* CTA Section */}
            <MaxWidthWrapper className="mt-20 max-w-[100vw] overflow-x-hidden scrollbar-hide">
                <AnimationContainer delay={0.1}>
                    <LampContainer>
                        <div className="flex flex-col items-center justify-center relative w-full text-center">
                            <h2 className="bg-gradient-to-b from-neutral-200 to-neutral-400 py-4 bg-clip-text text-center text-4xl md:text-7xl !leading-[1.15] font-medium font-heading tracking-tight text-transparent mt-8">
                                Reclaim Your Lost Crypto Today
                            </h2>
                            <p className="text-muted-foreground mt-6 max-w-md mx-auto">
                                Experience the cutting-edge solution that helps you recover lost funds with ease. Trust our expert team to restore your crypto assets securely and efficiently.
                            </p>
                            <div className="mt-6">
                                <Link to={"/login"}>
                                    <Button>
                                        Start My Verification
                                        <ArrowRightIcon className="w-4 h-4 ml-2" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </LampContainer>
                </AnimationContainer>
            </MaxWidthWrapper>

        </div>
        <Footer />
        </>
    )
};

export default HomePage
