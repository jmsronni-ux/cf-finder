// Tier System Configuration
// This file defines the tier system for user upgrades

export const TIER_CONFIG = {
    1: {
        name: "Basic",
        description: "Entry-level tier with basic features",
        features: [
            "Basic analytics",
            "Standard support",
            "Limited API calls"
        ],
        maxBalance: 1000,
        apiLimit: 100,
        upgradePrice: 0 // Free starting tier
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
        apiLimit: 500,
        upgradePrice: 50
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
        apiLimit: 2000,
        upgradePrice: 100
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
        apiLimit: 10000,
        upgradePrice: 250
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
        apiLimit: 50000,
        upgradePrice: 500
    }
};

// Helper functions for tier management
export const getTierInfo = (tierNumber) => {
    return TIER_CONFIG[tierNumber] || TIER_CONFIG[1];
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
    const current = TIER_CONFIG[currentTier] || TIER_CONFIG[1];
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
    const startTier = user.tier + 1; // Start from next tier
    for (let tier = startTier; tier <= 5; tier++) {
        options.push({
            tier,
            ...TIER_CONFIG[tier]
        });
    }
    return options;
};

// Get tier upgrade price for a specific user
export const getUserTierPrice = (user, tier) => {
    if (tier < 2 || tier > 5) return 0;
    
    // Check if user has custom price set
    const customPriceField = `tier${tier}Price`;
    if (user[customPriceField] !== null && user[customPriceField] !== undefined) {
        return user[customPriceField];
    }
    
    // Fall back to default price
    return TIER_CONFIG[tier].upgradePrice;
};

// Check if user can upgrade to target tier with custom pricing
export const canUpgradeWithCustomPrice = (user, targetTier) => {
    if (targetTier <= user.tier || targetTier > 5) return false;
    
    const upgradePrice = getUserTierPrice(user, targetTier);
    return user.balance >= upgradePrice;
};

// Calculate tier prices from network rewards and conversion rates
export const calculateTierPricesFromRewards = (networkRewards, conversionRates) => {
    const tierPrices = {};
    
    for (let tier = 1; tier <= 5; tier++) {
        const levelRewards = networkRewards.filter(r => r.level === tier && r.isActive);
        let totalUSDValue = 0;
        
        // Calculate total USD value for this tier
        for (const reward of levelRewards) {
            const conversionRate = conversionRates[reward.network] || 1;
            const usdValue = reward.rewardAmount * conversionRate;
            totalUSDValue += usdValue;
        }
        
        // Round to 2 decimal places
        tierPrices[`tier${tier}Price`] = Math.round(totalUSDValue * 100) / 100;
    }
    
    return tierPrices;
};

