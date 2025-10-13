import { BarChart3Icon, FolderOpenIcon, WandSparklesIcon } from "lucide-react";

export const DEFAULT_AVATAR_URL = "https://api.dicebear.com/8.x/initials/svg?backgroundType=gradientLinear&backgroundRotation=0,360&seed=";

export const PAGINATION_LIMIT = 10;

export const COMPANIES = [
    {
        name: "Binance",
        logo: "/logos-white/binance.png",
    },
    {
        name: "Tesla",
        logo: "/logos-white/tesla.png",
    },

    {
        name: "Crypto",
        logo: "/logos-white/crypto.com.png",
    },
    {
        name: "Microsoft",
        logo: "/logos-white/Microsoft.png",
    },
    {
        name: "Bybit",
        logo: "/logos-white/bybit.png",
    },
    {
        name: "Yahoo",
        logo: "/logos-white/yahoo-finance.png",
    }
] as const;

import { PhoneCallIcon, FormInputIcon, WalletCardsIcon } from "lucide-react";

export const PROCESS = [
    {
        title: "Submit Your Details",
        description: "Fill out a quick form with your wallet info and details about your lost funds.",
        icon: FormInputIcon,
    },
    {
        title: "Get a Free Consultation",
        description: "Our expert agent will contact you to guide you through the recovery process.",
        icon: PhoneCallIcon,
    },
    {
        title: "Recover Your Funds",
        description: "We’ll help you track and recover your lost crypto, all at no cost to you.",
        icon: WalletCardsIcon,
    },
] as const;

export const FEATURES = [
    {
        title: "Link shortening",
        description: "Create short links that are easy to remember and share.",
    },
    {
        title: "Advanced analytics",
        description: "Track and measure the performance of your links.",
    },
    {
        title: "Password protection",
        description: "Secure your links with a password.",
    },
    {
        title: "Custom QR codes",
        description: "Generate custom QR codes for your links.",
    },
    {
        title: "Link expiration",
        description: "Set an expiration date for your links.",
    },
    {
        title: "Team collaboration",
        description: "Share links with your team and collaborate in real-time.",
    },
] as const;

export const REVIEWS = [
    {
        name: "Michael Smith",
        username: "@michaelsmith",
        avatar: "https://randomuser.me/api/portraits/men/1.jpg",
        rating: 5,
        review: "I lost access to my crypto wallet, but this service helped me recover everything! The team was incredibly professional and supportive."
    },
    {
        name: "Emily Johnson",
        username: "@emilyjohnson",
        avatar: "https://randomuser.me/api/portraits/women/1.jpg",
        rating: 5,
        review: "Amazing service! They recovered my lost funds quickly and explained every step of the process. Highly recommend!"
    },
    {
        name: "Daniel Williams",
        username: "@danielwilliams",
        avatar: "https://randomuser.me/api/portraits/men/2.jpg",
        rating: 5,
        review: "I thought my crypto was gone forever, but this team worked miracles. Their expertise and dedication are unmatched."
    },
    {
        name: "Sophia Brown",
        username: "@sophiabrown",
        avatar: "https://randomuser.me/api/portraits/women/2.jpg",
        rating: 5,
        review: "The free consultation was a lifesaver. They guided me through the recovery process and got my funds back. Thank you!"
    },
    {
        name: "James Taylor",
        username: "@jamestaylor",
        avatar: "https://randomuser.me/api/portraits/men/3.jpg",
        rating: 5,
        review: "I was skeptical at first, but they delivered beyond my expectations. My lost crypto was recovered in no time!"
    },
    {
        name: "Olivia Martinez",
        username: "@oliviamartinez",
        avatar: "https://randomuser.me/api/portraits/women/3.jpg",
        rating: 5,
        review: "Incredible service! The team was patient and thorough. They made the recovery process stress-free and transparent."
    },
    {
        name: "William Garcia",
        username: "@williamgarcia",
        avatar: "https://randomuser.me/api/portraits/men/4.jpg",
        rating: 5,
        review: "I can't thank them enough for recovering my funds. Their expertise in blockchain technology is truly impressive."
    },
    {
        name: "Mia Rodriguez",
        username: "@miarodriguez",
        avatar: "https://randomuser.me/api/portraits/women/4.jpg",
        rating: 5,
        review: "The free support for individuals is a game-changer. They helped me recover my crypto without any hassle."
    },
    {
        name: "Henry Lee",
        username: "@henrylee",
        avatar: "https://randomuser.me/api/portraits/men/5.jpg",
        rating: 5,
        review: "This service is a must for anyone who's lost access to their crypto. They're reliable, fast, and incredibly skilled."
    },
] as const;
