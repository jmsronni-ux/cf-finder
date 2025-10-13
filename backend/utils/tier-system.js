// Tier System Configuration
// This file defines the tier system for user upgrades

export const TIER_CONFIG = {
    0: {
        name: "Free",
        description: "Starting tier with limited features",
        features: [
            "View only access",
            "Community support"
        ],
        maxBalance: 0,
        apiLimit: 10
    },
    1: {
        name: "Basic",
        description: "Entry-level tier with basic features",
        features: [
            "Basic analytics",
            "Standard support",
            "Limited API calls"
        ],
        maxBalance: 1000,
        apiLimit: 100
    },
    2: {
        name: "Standard",
        description: "Enhanced features for regular users",
        features: [
            "Advanced analytics",
            "Priority support",
            "Increased API calls",
            "Custom branding"
        ],
        maxBalance: 5000,
        apiLimit: 500
    },
    3: {
        name: "Professional",
        description: "Professional features for businesses",
        features: [
            "Premium analytics",
            "24/7 support",
            "High API limits",
            "White-label options",
            "Custom integrations"
        ],
        maxBalance: 25000,
        apiLimit: 2000
    },
    4: {
        name: "Enterprise",
        description: "Enterprise-grade features",
        features: [
            "Enterprise analytics",
            "Dedicated support",
            "Unlimited API calls",
            "Custom development",
            "SLA guarantees"
        ],
        maxBalance: 100000,
        apiLimit: 10000
    },
    5: {
        name: "Premium",
        description: "Highest tier with all features",
        features: [
            "All premium features",
            "Personal account manager",
            "Unlimited everything",
            "Custom solutions",
            "VIP treatment"
        ],
        maxBalance: 1000000,
        apiLimit: 50000
    }
};

// Helper functions for tier management
export const getTierInfo = (tierNumber) => {
    return TIER_CONFIG[tierNumber] || TIER_CONFIG[0];
};

export const getUpgradeOptions = (currentTier) => {
    const options = [];
    for (let tier = currentTier + 1; tier <= 5; tier++) {
        options.push({
            tier,
            ...TIER_CONFIG[tier]
        });
    }
    return options;
};

export const getTierBenefits = (currentTier, targetTier) => {
    const current = TIER_CONFIG[currentTier] || TIER_CONFIG[0];
    const target = TIER_CONFIG[targetTier];
    
    return {
        newFeatures: target.features.filter(feature => !current.features.includes(feature)),
        increasedLimits: {
            balance: target.maxBalance > current.maxBalance,
            api: target.apiLimit > current.apiLimit
        }
    };
};

// Get upgrade options for a user (no pricing, admin approval required)
export const getUpgradeOptionsForUser = (user) => {
    const options = [];
    const startTier = user.tier === 0 ? 1 : user.tier + 1; // Include tier 1 if user is at tier 0
    for (let tier = startTier; tier <= 5; tier++) {
        options.push({
            tier,
            ...TIER_CONFIG[tier]
        });
    }
    return options;
};

