import { PrivacyDashboard } from '@/components/privacy/privacy-dashboard';
import { Shield } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Abstract Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
      </div>

      <header className="relative z-10 border-b border-white/5 backdrop-blur-md bg-black/20">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Shield className="text-primary-foreground w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">VexProtocol</span>
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Network</a>
              <a href="#" className="hover:text-foreground transition-colors">Docs</a>
              <a href="#" className="hover:text-foreground transition-colors">Audit</a>
            </nav>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 container mx-auto px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Stateless <span className="text-primary">Privacy</span> Vault
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Securely shield assets using zero-knowledge compression. 
              Non-custodial, audit-ready, and randomized unshielding.
            </p>
          </div>
          
          <PrivacyDashboard />
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-12 bg-black/20">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-sm text-muted-foreground">
            © 2026 VexProtocol. Powered by Light Protocol & ZK Compression.
          </div>
          <div className="flex items-center gap-8 text-sm text-muted-foreground font-medium">
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
