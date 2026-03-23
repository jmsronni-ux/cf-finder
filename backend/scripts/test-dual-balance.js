import mongoose from 'mongoose';
import User from '../models/user.model.js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

dotenv.config();

async function testDualBalance() {
  try {
    const API_URL = 'http://localhost:5000/api';

    console.log('1. Starting headless tests for Dual Balance System');

    const ts = Date.now();
    const email = `testuser_${ts}@example.com`;
    const password = 'password123';
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    let user = new User({
        name: 'Headless Test',
        email,
        password: password,
        balance: 100, 
        availableBalance: 50, 
        tier: 1
    });
    await user.save();
    console.log(`Test user created: ${user.email} (ID: ${user._id}) with Balance: 100, Available: 50`);
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });

    console.log('2. Testing Dashboard -> Available Transfer');
    let res = await fetch(`${API_URL}/balance/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: 30, direction: 'dashboard_to_available' })
    });
    let data = await res.json();
    console.log('Transfer Response:', data);
    
    if (data.success && data.data.balance === 70 && data.data.availableBalance === 80) {
        console.log('✅ Dashboard -> Available Transfer works correctly.');
    } else {
        console.error('❌ Transfer failed or balance incorrect.', data);
    }

    console.log('3. Testing Available -> Dashboard Transfer');
    res = await fetch(`${API_URL}/balance/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: 10, direction: 'available_to_dashboard' })
    });
    data = await res.json();
    console.log('Transfer Response:', data);
    
    if (data.success && data.data.balance === 80 && data.data.availableBalance === 70) {
        console.log('✅ Available -> Dashboard Transfer works correctly.');
    } else {
        console.error('❌ Transfer failed or balance incorrect.', data);
    }

    console.log('4. Testing Insufficient Funds Transfer');
    res = await fetch(`${API_URL}/balance/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: 1000, direction: 'dashboard_to_available' })
    });
    data = await res.json();
    if (!data.success && data.message.includes('Insufficient dashboard balance')) {
         console.log('✅ Insufficient funds guard works.');
    } else {
         console.error('❌ Insufficient funds guard failed.', data);
    }

    console.log('5. Testing Withdrawal (Deducts from Available)');
    res = await fetch(`${API_URL}/balance/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: 20, wallet: '0xtestwallet123' })
    });
    data = await res.json();
    if (data.success && data.data.remainingBalance === 50) { // 70 - 20 = 50
        console.log('✅ Withdraw logic correctly deducted from average balance, new balance:', data.data.remainingBalance);
    } else {
        console.error('❌ Withdraw logic failed:', data);
    }
    
    await mongoose.disconnect();
    console.log('Done.');

  } catch (error) {
    console.error('Test script error:', error);
  }
}

testDualBalance();
