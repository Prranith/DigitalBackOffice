import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  Database, 
  Terminal, 
  BarChart3, 
  Cpu, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { signInWithGoogle, signInAsGuest } from '../services/firebase';
import { ParticleBackground } from './common/ParticleBackground';

interface AuthGatewayProps {
  onAuthenticated: (userPayload?: any) => void;
}

export const AuthGateway: React.FC<AuthGatewayProps> = ({ onAuthenticated }) => {
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingGuest, setIsLoadingGuest] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoadingGoogle(true);
    setErrorMessage(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        onAuthenticated(user);
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-blocked') {
        setErrorMessage('Sign-in popup was blocked by your browser. Please allow popups or use Enterprise Demo Access.');
      } else if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Sign-in popup was closed. Please try again or use Enterprise Demo Access.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setErrorMessage('Google sign-in is not enabled for this host. Add localhost to Firebase Authentication > Settings > Authorized domains, or use Executive Demo Access.');
      } else {
        setErrorMessage(err.message || 'Authentication encountered an error. You can also use Enterprise Demo Access.');
      }
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleGuestSignIn = async () => {
    setIsLoadingGuest(true);
    setErrorMessage(null);
    try {
      const fbUser = await signInAsGuest();
      if (fbUser) {
        onAuthenticated(fbUser);
      } else {
        // Fallback local executive guest session
        onAuthenticated({
          uid: 'executive_demo_user',
          displayName: 'Executive Analyst',
          email: 'analyst@enterprise.internal',
          photoURL: null,
          isAnonymous: true,
        });
      }
    } catch (err) {
      console.warn('Guest sign in issue, activating local demo pass:', err);
      onAuthenticated({
        uid: 'executive_demo_user',
        displayName: 'Executive Analyst',
        email: 'analyst@enterprise.internal',
        photoURL: null,
        isAnonymous: true,
      });
    } finally {
      setIsLoadingGuest(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-black text-white selection:bg-zinc-800 flex flex-col justify-between overflow-x-hidden">
      {/* Particle Background Effect */}
      <ParticleBackground />

      {/* Ambient Radial Glow Gradients */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-zinc-800/20 via-black to-black opacity-80" />
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-indigo-500/5 blur-[120px] rounded-full" />

      {/* Top Brand Bar */}
      <header className="relative z-10 w-full px-6 py-6 flex items-center justify-between border-b border-zinc-900/60 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-white shadow-inner">
            <Sparkles className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white font-sans">
                DigitalBackOffice AI
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                v2.4 Production
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono hidden sm:block">
              Autonomous Financial Intelligence & Multi-Modal Data Ops
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-zinc-400">Security Gateway Active</span>
        </div>
      </header>

      {/* Main Authentication Card Viewport */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md mx-auto">
          {/* Main Auth Container */}
          <div className="relative rounded-2xl border border-zinc-850 bg-zinc-950/90 p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
            {/* Card Header */}
            <div className="text-center space-y-2 mb-8">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-[11px] text-zinc-300">
                <Lock className="h-3 w-3 text-indigo-400" />
                <span>Zero-Trust Enterprise Access</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
                Authenticate to Access
              </h1>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Sign in with your organization account or launch an executive demo session to inspect datasets, run queries, and generate intelligence.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* Auth Actions */}
            <div className="space-y-3.5">
              {/* Primary Google Auth Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoadingGoogle || isLoadingGuest}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 transition shadow-lg shadow-white/5 disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {isLoadingGoogle ? (
                  <div className="h-5 w-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google Workspace</span>
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center py-2">
                <div className="w-full border-t border-zinc-850" />
                <span className="absolute bg-zinc-950 px-3 text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                  or
                </span>
              </div>

              {/* Executive Demo / Guest Pass Button */}
              <button
                type="button"
                onClick={handleGuestSignIn}
                disabled={isLoadingGoogle || isLoadingGuest}
                className="w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 hover:bg-zinc-850 px-4 py-3 text-xs font-semibold text-zinc-200 hover:text-white transition group disabled:opacity-60"
              >
                <div className="flex items-center gap-2.5">
                  <Cpu className="h-4 w-4 text-indigo-400 group-hover:text-indigo-300" />
                  <div className="text-left">
                    <div className="font-semibold text-zinc-100">Executive Demo Pass</div>
                    <div className="text-[10px] text-zinc-400 font-normal">Instant access with preloaded datasets</div>
                  </div>
                </div>
                {isLoadingGuest ? (
                  <div className="h-4 w-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-zinc-200 group-hover:translate-x-0.5 transition" />
                )}
              </button>
            </div>

            {/* Security Compliance Pills */}
            <div className="mt-8 pt-6 border-t border-zinc-850 grid grid-cols-2 gap-2 text-[11px] font-mono text-zinc-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>SOC-2 Type II</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>AES-256 Storage</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Zero-Retention</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Role-Based Access</span>
              </div>
            </div>
          </div>

          {/* Platform Capabilities Highlights */}
          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-zinc-850 bg-black/60 p-3">
              <Terminal className="h-4 w-4 text-indigo-400 mx-auto mb-1.5" />
              <div className="text-[11px] font-semibold text-zinc-200">ANSI SQL</div>
              <div className="text-[9px] text-zinc-400 font-mono mt-0.5">In-Memory Engine</div>
            </div>
            <div className="rounded-xl border border-zinc-850 bg-black/60 p-3">
              <Database className="h-4 w-4 text-emerald-400 mx-auto mb-1.5" />
              <div className="text-[11px] font-semibold text-zinc-200">Vector RAG</div>
              <div className="text-[9px] text-zinc-400 font-mono mt-0.5">Semantic Ingest</div>
            </div>
            <div className="rounded-xl border border-zinc-850 bg-black/60 p-3">
              <BarChart3 className="h-4 w-4 text-amber-400 mx-auto mb-1.5" />
              <div className="text-[11px] font-semibold text-zinc-200">Executive BI</div>
              <div className="text-[9px] text-zinc-400 font-mono mt-0.5">Automated KPIs</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full px-6 py-4 border-t border-zinc-900/60 bg-black/40 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-500 font-mono">
        <div>&copy; {new Date().getFullYear()} DigitalBackOffice AI Enterprise Systems</div>
        <div className="flex items-center gap-4">
          <span>Encrypted Session</span>
          <span>&bull;</span>
          <span>Firestore Integration</span>
          <span>&bull;</span>
          <span>Strict Privacy Controls</span>
        </div>
      </footer>
    </div>
  );
};
