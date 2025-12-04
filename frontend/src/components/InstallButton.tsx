import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { cn } from '../lib/utils';

export function InstallButton() {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  // Don't show button if already installed or not installable
  if (isInstalled || !isInstallable) {
    return null;
  }

  const handleInstall = async () => {
    await promptInstall();
  };

  return (
    <motion.button
      onClick={handleInstall}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-full',
        'bg-gradient-to-r from-[var(--color-tropical-gold)] to-[var(--color-tropical-orange)]',
        'text-white font-semibold text-sm',
        'border-2 border-[var(--color-tropical-gold)]/30',
        'shadow-lg hover:shadow-xl',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-[var(--color-tropical-gold)] focus:ring-offset-2'
      )}
      aria-label="Install Muchas Radio app"
    >
      <Download className="w-4 h-4" />
      <span>Install App</span>
    </motion.button>
  );
}

