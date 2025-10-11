# OrderSwap Frontend

A modern, professional crypto swap frontend built with Next.js 15, inspired by PancakeSwap.

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: ShadCN UI + Lucide Icons
- **State Management**: Zustand
- **Fonts**: Kanit (Google Fonts)

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Landing page
│   │   ├── dashboard/         # Dashboard page
│   │   ├── swap/              # Swap interface
│   │   ├── pools/             # Liquidity pools
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── ui/                # ShadCN UI components
│   │   ├── navbar.tsx         # Navigation bar
│   │   ├── hero.tsx           # Hero section
│   │   ├── features.tsx       # Features section
│   │   ├── footer.tsx         # Footer
│   │   └── theme-provider.tsx # Theme provider
│   ├── store/                 # Zustand stores
│   │   ├── walletStore.ts     # Wallet state
│   │   ├── themeStore.ts      # Theme state
│   │   └── orderStore.ts      # Orders/trades state
│   └── lib/                   # Utilities
│       └── utils.ts           # Helper functions
├── public/                    # Static assets
├── package.json              # Dependencies
└── tsconfig.json             # TypeScript config
```

## 🎨 Features

### Landing Page
- **Hero Section**: Eye-catching headline with CTA buttons
- **Features Grid**: Showcasing platform benefits
- **Stats Cards**: Display trading volume, security, and speed
- **Responsive Design**: Mobile-first approach

### Dashboard
- **Wallet Overview**: Connection status and balance
- **Stats Grid**: Total orders, active trades, success rate
- **Recent Orders**: Trading history with status indicators
- **Active Trades**: Currently open positions
- **Portfolio Chart**: Placeholder for analytics (coming soon)

### Swap Page
- Token swap interface with from/to inputs
- Real-time rate display
- Fee information
- Wallet integration ready

### Pools Page
- Liquidity pool overview
- APR display for each pool
- 24h volume and total liquidity stats
- Add/remove liquidity interface

## 🛠️ State Management

### Zustand Stores

1. **Wallet Store** (`walletStore.ts`)
   - Connection status
   - Wallet address & public key
   - Balance tracking
   - Connect/disconnect functions

2. **Theme Store** (`themeStore.ts`)
   - Light/dark mode toggle
   - Persisted in localStorage
   - Auto-applies theme on load

3. **Order Store** (`orderStore.ts`)
   - Orders management (buy/sell)
   - Active trades tracking
   - Status updates (pending, completed, failed)

## 🎨 Design System

### Colors
- **Primary**: Purple/blue accent (`oklch(0.58 0.24 264)`)
- **Background**: Light/dark adaptive
- **Cards**: Elevated with subtle borders
- **Gradients**: Minimal, crypto-themed

### Typography
- **Font Family**: Kanit (300, 400, 500, 600, 700)
- **Headings**: Bold, large spacing
- **Body**: Medium weight, readable

### Components
- **Buttons**: Primary, outline, ghost, link variants
- **Cards**: Rounded corners, shadow effects
- **Inputs**: Clean, focused states
- **Icons**: Lucide React icons

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run Biome linter
- `npm run format` - Format code with Biome

## 🔗 Backend Integration

The frontend is fully integrated with the NestJS backend API. See `INTEGRATION.md` for detailed documentation.

### Quick Setup

1. Create `.env.local` from example:
```bash
cp .env.local.example .env.local
```

2. Configure API URL:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

3. Use the API client:
```typescript
import { api } from '@/lib/api';
const trades = await api.getTradeHistory();
```

### Available Integrations

- ✅ Trade execution and history
- ✅ Strategy management (automated trading)
- ✅ Wallet management and balances
- ✅ Real-time price feeds
- ✅ WebSocket for live updates
- ✅ TypeScript types for all endpoints

## 🌐 Navigation

- `/` - Landing page
- `/dashboard` - User dashboard
- `/swap` - Token swap interface
- `/pools` - Liquidity pools

## 🎯 Next Steps

- [ ] Integrate Solana wallet adapters (Phantom, Solflare, etc.)
- [ ] Connect to backend API endpoints
- [ ] Implement real-time price feeds
- [ ] Add transaction history
- [ ] Implement chart visualization (Recharts/TradingView)
- [ ] Add loading states and error handling
- [ ] Implement toast notifications
- [ ] Add wallet transaction signing
- [ ] Create settings page
- [ ] Add authentication flow

## 📦 Key Dependencies

```json
{
  "next": "15.5.4",
  "react": "19.1.0",
  "zustand": "latest",
  "tailwindcss": "^4",
  "lucide-react": "^0.544.0",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.3.1"
}
```

## 🎨 Theme Toggle

The theme system uses Zustand with localStorage persistence:
- Click the sun/moon icon in the navbar to toggle
- Preference is saved and restored on page reload
- CSS variables automatically update

## 📱 Responsive Design

- **Mobile**: Single column layout, hamburger menu (future)
- **Tablet**: Two-column grids
- **Desktop**: Full multi-column layouts with sidebar

## 🔒 Security Notes

- Never commit `.env.local` or private keys
- Use environment variables for sensitive data
- Validate all user inputs
- Implement rate limiting on backend

## 📄 License

This project is part of the OrderSwap platform.

---

**Built with ❤️ using Next.js, Tailwind CSS, and modern React patterns**
