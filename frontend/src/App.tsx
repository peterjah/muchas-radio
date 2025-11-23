import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { motion } from 'framer-motion';
import { Radio, User as UserIcon, Wifi, WifiOff } from 'lucide-react';
import { Player } from './components/Player';
import { NowPlaying } from './components/NowPlaying';
import { Queue } from './components/Queue';
import { UploadForm } from './components/UploadForm';
import { UsernameModal } from './components/UsernameModal';
import { useRadio } from './hooks/useRadio';
import muchasLogo from './assets/muchas_logo.png';
import { cn } from './lib/utils';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function RadioApp() {
  const [username, setUsername] = useState<string | null>(
    localStorage.getItem('username')
  );
  const { currentTrack, queue, isLoadingCurrent, isLoadingQueue, isConnected } = useRadio();

  return (
    <div className="min-h-screen">
      <UsernameModal onUsernameSet={setUsername} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'white',
            border: '2px solid var(--color-tropical-gold)',
          },
          className: 'sonner-toast',
        }}
      />
      
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-xl border border-white/20 shadow-2xl p-6 md:p-8"
        >
          {/* Decorative gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-tropical-gold)]/10 via-transparent to-[var(--color-tropical-orange)]/10 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo and title */}
            <div className="flex items-center gap-6">
              <motion.img
                src={muchasLogo}
                alt="Muchas Radio"
                className="h-20 w-auto filter drop-shadow-lg"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              />
              <div className="text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-tropical-dark)] mb-1 tracking-tight">
                  Muchas Radio
                </h1>
                <div className="flex items-center gap-2 text-[var(--color-tropical-orange)] font-medium">
                  <Radio className="w-4 h-4" />
                  <p className="italic text-sm md:text-base">Your Tropical Radio Station 🌴</p>
                </div>
              </div>
            </div>

            {/* User info and status */}
            <div className="flex items-center gap-4">
              {username && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[var(--color-tropical-gold)]/20 to-[var(--color-tropical-orange)]/20 border border-[var(--color-tropical-gold)]/30"
                >
                  <UserIcon className="w-4 h-4 text-[var(--color-tropical-dark)]" />
                  <span className="font-semibold text-[var(--color-tropical-dark)] text-sm">
                    {username}
                  </span>
                </motion.div>
              )}
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-2',
                  isConnected
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                )}
              >
                {isConnected ? (
                  <>
                    <Wifi className="w-4 h-4" />
                    <span>Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4" />
                    <span>Offline</span>
                  </>
                )}
              </motion.div>
            </div>
          </div>
        </motion.header>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Player, NowPlaying, Upload */}
          <div className="lg:col-span-2 space-y-6">
            <Player />
            <NowPlaying currentTrack={currentTrack} isLoading={isLoadingCurrent} />
            <UploadForm />
          </div>
          
          {/* Right column - Queue */}
          <div className="lg:col-span-1">
            <Queue queue={queue || []} isLoading={isLoadingQueue} />
          </div>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <div className="inline-flex flex-col items-center gap-3 px-8 py-6 rounded-2xl bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-lg border border-white/20">
            <img
              src={muchasLogo}
              alt="Muchas Radio"
              className="h-12 w-auto opacity-80 filter drop-shadow-md"
            />
            <div className="space-y-1">
              <p className="text-sm text-[var(--color-tropical-dark)] font-medium">
                A collaborative radio experience - Everyone listens together 🎧
              </p>
              <p className="text-xs text-[var(--color-tropical-orange)] italic">
                Muchas Radio © 2025 - Tropical Vibes All Day 🌴☀️
              </p>
            </div>
            <motion.a
              href="https://github.com/peterjah/muchas-radio"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="mt-2 p-2 rounded-full hover:bg-[var(--color-tropical-gold)]/20 transition-colors"
              aria-label="View on GitHub"
            >
              <svg
                className="w-5 h-5 text-[var(--color-tropical-dark)]"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </motion.a>
          </div>
        </motion.footer>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RadioApp />
    </QueryClientProvider>
  );
}

export default App;
