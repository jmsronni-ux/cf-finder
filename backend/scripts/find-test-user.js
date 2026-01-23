import mongoose from 'mongoose';
import User from './models/user.model.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env.development.local') });

async function findUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({
            $or: [
                { 'wallets.eth': { $ne: null } },
                { 'wallets.usdtErc20': { $ne: null } }
            ]
        });

        if (user) {
            console.log('FOUND_USER_START');
            console.log(JSON.stringify({
                _id: user._id,
                email: user.email,
                wallets: user.wallets
            }));
            console.log('FOUND_USER_END');
        } else {
            console.log('No user with a wallet address found.');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

findUser();
