import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('address');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    // Get wallet balance from Jupiter API
    const response = await fetch(`https://lite-api.jup.ag/ultra/v1/holdings/${walletAddress}/native`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch balance from Jupiter API');
    }

    const data = await response.json();
    
    // Jupiter returns native SOL balance in the format:
    // { "amount": "1000000000", "uiAmount": 1, "uiAmountString": "1" }
    const balances = {
      wallet: {
        lamports: parseInt(data.amount),
        sol: data.uiAmount,
        formatted: data.uiAmountString
      }
    };

    return NextResponse.json(balances);
  } catch (error) {
    console.error('Balance fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch balances' }, { status: 500 });
  }
}
