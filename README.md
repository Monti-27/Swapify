# Swapify

Swapify is the product name for this codebase. It is a Solana trading stack built around fast swaps, automated strategies, and the services needed to run them reliably.

This repository holds the main pieces of the project in one place: the frontend, the backend, the on-chain program, and the supporting services around it.

## What is in this repo

- `frontend/` contains the Next.js app for the landing pages, dashboard, wallet flows, and trading experience.
- `OrderSwap Backend/` contains the NestJS API, authentication flow, strategy management, WebSocket updates, and database layer.
- `program/` contains the Solana program workspace, along with the CLI, keeper bot, and indexer.
- `docs/` contains the documentation source files.
- The root markdown files such as `getting-started.md` and `core-features.md` are the product docs.

## How the pieces fit together

- The frontend handles the user-facing app and wallet interactions.
- The backend handles auth, persistence, orchestration, and real-time updates.
- The Solana program holds the core on-chain logic.
- The keeper watches for valid execution conditions and submits actions when needed.
- The indexer listens for on-chain events and pushes useful data into Supabase for easier querying.

## Tech stack

- Frontend: Next.js, React, TypeScript, Tailwind, Zustand, Solana wallet tooling
- Backend: NestJS, Prisma, PostgreSQL, Socket.IO, Jupiter APIs
- On-chain and services: Anchor, Solana Web3.js, TypeScript, Supabase

## Repository structure

```text
.
├── README.md
├── frontend/                     # Swapify web app
├── OrderSwap Backend/            # API and execution backend
├── program/                      # Solana program workspace
│   ├── app/                      # CLI and TypeScript client
│   ├── indexer/                  # Event indexer
│   ├── keeper/                   # Automated execution bot
│   ├── programs/                 # Anchor program source
│   └── scripts/                  # Development scripts
├── docs/                         # Documentation source
├── getting-started.md
├── core-features.md
├── step-by-step-tutorials.md
├── tokenomics-and-launch.md
├── security-and-infrastructure.md
├── roadmap.md
└── faq-and-contact.md
```

## Running the project locally

You do not need every part running at the same time unless you are working on full end-to-end flows. Most day-to-day work starts with the frontend or backend.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

The frontend runs on `http://localhost:3000` by default.

### Backend

```bash
cd "OrderSwap Backend"
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

The backend runs on `http://localhost:3001` by default.

### Program workspace and supporting services

Use the `program/` directory when you need the protocol-side tooling:

- `program/app/` for the CLI and TypeScript client
- `program/indexer/` for event syncing
- `program/keeper/` for automated execution

Each of those folders has its own `README.md` with setup details.

## Documentation map

- `getting-started.md` for the first-time setup flow
- `core-features.md` for the main product features
- `step-by-step-tutorials.md` for walkthroughs
- `tokenomics-and-launch.md` for token details
- `security-and-infrastructure.md` for architecture and safety notes
- `roadmap.md` for planned milestones
- `faq-and-contact.md` for common questions

## Naming note

The product is now called Swapify. Some folder names and internal packages still use older project naming, but this repository is the Swapify codebase.
