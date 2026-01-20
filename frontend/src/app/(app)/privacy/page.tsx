import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { PrivacyDashboard } from '@/components/privacy/privacy-dashboard';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen flex flex-col relative bg-background">
            <div className="absolute inset-0 gradient-purple-radial pointer-events-none" />
            <div className="relative z-10 flex-1 flex flex-col">
                <Navbar />
                <main className="flex-1 container mx-auto px-4 pt-32 pb-20">
                    <div className="max-w-5xl mx-auto">
                        <div className="mb-10">
                            <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Vault</h1>
                            <p className="text-muted-foreground">Securely shield and transfer assets using ZK compression.</p>
                        </div>
                        <PrivacyDashboard />
                    </div>
                </main>
                <Footer />
            </div>
        </div>
    );
}
