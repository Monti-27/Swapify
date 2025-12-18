"use client";

import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import { ToastContainer } from "react-toastify";

import {
  ArrowRightIcon,
  BoltIcon,
} from "@heroicons/react/16/solid";
import { Dashboard } from "@/components/dashboard/Dashboard";

const heroStats = [
  { label: "Zero-knowledge", value: "Private" },
  { label: "Telegram native", value: "Bot ready" },
  { label: "Secure custody", value: "TEE protected" },
];


function Home() {
  const { ready, authenticated, login } = usePrivy();
  
  if (!ready) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#E0E7FF66]">
      {authenticated ? (
        <Dashboard />
      ) : (
        <Landing login={login} />
      )}
  
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable={false}
        pauseOnHover
        limit={1}
        aria-label="Toast notifications"
        style={{ top: 58 }}
        theme="dark"
        toastClassName="!bg-gray-800 !text-white !border !border-gray-700"
        progressClassName="!bg-green-500"
      />
    </div>
  );
}

export default Home;

const Landing = ({ login }: { login: () => void }) => {
  const handleLogin = () => {
    login();
    setTimeout(() => {
      (
        document.querySelector('input[type="email"]') as HTMLInputElement
      )?.focus();
    }, 150);
  };

  return (
    <div className="relative isolate min-h-screen text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <Image
          src="/BG.svg"
          alt="Star field"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#040217]/75" />
      </div>

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-16 px-4 py-16 md:px-6 md:gap-20 md:py-24">
        <section className="md:rounded-3xl md:border md:border-white/10 md:bg-white/5 p-4 md:p-8 md:shadow-[0px_40px_80px_rgba(3,1,15,0.45)] md:backdrop-blur">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-white/30 bg-white/10 p-4">
                <Image
                  src="/green.svg"
                  alt="logo"
                  width={48}
                  height={48}
                  className="h-12 w-12"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                  Privacy Send
                </p>
                <p className="text-2xl font-semibold text-white">Telegram bot</p>
              </div>
            </div>
            <span className="w-fit rounded-full border border-white/30 px-4 py-1 text-xs uppercase tracking-[0.4em] text-white/80">
              Private SOL
            </span>
          </div>

          <div className="mt-8 flex flex-col gap-6 text-left">
            <h1 className="font-abc-favorit text-4xl leading-tight md:text-5xl">
              Maximum privacy, minimum effort.
            </h1>
            <p className="text-lg text-white/80">
              One slash command handles private SOL transfers in Telegram.
              Send SOL anonymously and securely using ZK proofs.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-4 text-sm md:flex-row md:items-center">
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <button
                onClick={handleLogin}
                className="button-primary rounded-full bg-white text-[#040217]"
              >
                Launch App
              </button>
              <a
                href="https://docs.sendzk.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/30 px-6 py-3 text-center text-white hover:bg-white/10 transition-colors"
              >
                View Docs
              </a>
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <BoltIcon className="h-5 w-5" />
              Runs on Privacy Cash + Privy wallets
            </div>
          </div>

          <div className="mt-8 grid gap-4 rounded-2xl border border-white/15 bg-white/5 p-6 text-center sm:grid-cols-3">
            {heroStats.map((stat) => (
              <div key={stat.label} className="space-y-1">
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">
                  {stat.label}
                </p>
                <p className="text-2xl font-semibold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>


        <section className="grid gap-6 md:rounded-3xl md:border md:border-white/10 md:bg-white/5 p-4 md:p-6 md:backdrop-blur lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[#B5B3FF]">
              Commands
            </p>
            <h2 className="mt-3 text-3xl font-semibold">Privacy with a single command</h2>
            <p className="mt-3 text-sm text-white/75">
              Sending SOL privately in just one command.
            </p>
          </div>

        </section>

      </main>
    </div>
  );
};
