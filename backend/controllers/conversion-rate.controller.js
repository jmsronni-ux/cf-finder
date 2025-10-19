import ConversionRate from '../models/conversion-rate.model.js';
import { ApiError } from '../middlewares/error.middleware.js';

// Default conversion rates (used for initialization)
const DEFAULT_RATES = {
  BTC: 45000,
  ETH: 3000,
  TRON: 0.1,
  USDT: 1,
  BNB: 300,
  SOL: 100
};

// Get all conversion rates
export const getConversionRates = async (req, res, next) => {
  try {
    const rates = await ConversionRate.find({}).sort({ network: 1 });
    
    // If no rates in database, initialize with defaults
    if (rates.length === 0) {
      console.log('[Conversion Rates] No rates found, initializing with defaults...');
      const defaultRates = await initializeDefaultRates();
      
      return res.status(200).json({
        success: true,
        message: 'Conversion rates retrieved successfully (initialized with defaults)',
        data: {
          rates: defaultRates,
          count: defaultRates.length
        }
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Conversion rates retrieved successfully',
      data: {
        rates,
        count: rates.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get conversion rate for specific network
export const getConversionRate = async (req, res, next) => {
  try {
    const { network } = req.params;
    
    if (!['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'].includes(network)) {
      throw new ApiError(400, 'Invalid network. Must be one of: BTC, ETH, TRON, USDT, BNB, SOL');
    }
    
    const rate = await ConversionRate.findOne({ network });
    
    if (!rate) {
      // Return default rate if not found
      const defaultRate = DEFAULT_RATES[network];
      return res.status(200).json({
        success: true,
        message: `Using default rate for ${network}`,
        data: {
          rate: {
            network,
            rateToUSD: defaultRate,
            isDefault: true
          }
        }
      });
    }
    
    res.status(200).json({
      success: true,
      message: `Conversion rate for ${network} retrieved successfully`,
      data: { rate }
    });
  } catch (error) {
    next(error);
  }
};

// Bulk update conversion rates (Admin only)
export const updateConversionRates = async (req, res, next) => {
  try {
    const { rates } = req.body;
    const userId = req.user?.id;
    
    if (!rates || typeof rates !== 'object') {
      throw new ApiError(400, 'Rates object is required');
    }
    
    const validNetworks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
    const rateEntries = Object.entries(rates);
    
    if (rateEntries.length === 0) {
      throw new ApiError(400, 'At least one rate must be provided');
    }
    
    // Validate all networks and rates
    for (const [network, rate] of rateEntries) {
      if (!validNetworks.includes(network)) {
        throw new ApiError(400, `Invalid network: ${network}. Must be one of: ${validNetworks.join(', ')}`);
      }
      if (typeof rate !== 'number' || rate < 0) {
        throw new ApiError(400, `Invalid rate for ${network}: ${rate}. Must be a non-negative number.`);
      }
    }
    
    const results = [];
    
    // Update each conversion rate
    for (const [network, rateToUSD] of rateEntries) {
      const rate = await ConversionRate.findOneAndUpdate(
        { network },
        {
          network,
          rateToUSD,
          $set: {
            'metadata.updatedBy': userId,
            'metadata.updatedAt': new Date()
          }
        },
        {
          upsert: true,
          new: true,
          runValidators: true
        }
      );
      
      results.push(rate);
    }
    
    console.log(`[Conversion Rates] Updated ${results.length} rates by admin ${userId}`);
    
    res.status(200).json({
      success: true,
      message: 'Conversion rates updated successfully',
      data: {
        rates: results,
        count: results.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update single conversion rate (Admin only)
export const updateSingleRate = async (req, res, next) => {
  try {
    const { network } = req.params;
    const { rateToUSD } = req.body;
    const userId = req.user?.id;
    
    if (!['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'].includes(network)) {
      throw new ApiError(400, 'Invalid network. Must be one of: BTC, ETH, TRON, USDT, BNB, SOL');
    }
    
    if (rateToUSD === undefined || typeof rateToUSD !== 'number' || rateToUSD < 0) {
      throw new ApiError(400, 'Valid rateToUSD is required (must be non-negative number)');
    }
    
    const rate = await ConversionRate.findOneAndUpdate(
      { network },
      {
        network,
        rateToUSD,
        $set: {
          'metadata.updatedBy': userId,
          'metadata.updatedAt': new Date()
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );
    
    console.log(`[Conversion Rates] Updated ${network} rate to ${rateToUSD} by admin ${userId}`);
    
    res.status(200).json({
      success: true,
      message: `Conversion rate for ${network} updated successfully`,
      data: { rate }
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to initialize default rates
async function initializeDefaultRates(userId = null) {
  const rates = [];
  
  for (const [network, rateToUSD] of Object.entries(DEFAULT_RATES)) {
    const rate = await ConversionRate.findOneAndUpdate(
      { network },
      {
        network,
        rateToUSD,
        $set: {
          'metadata.updatedBy': userId
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );
    rates.push(rate);
  }
  
  console.log('[Conversion Rates] Initialized default rates');
  return rates;
}

export { initializeDefaultRates };

