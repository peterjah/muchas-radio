import { useState, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Radio, FileText } from 'lucide-react';
import muchasLogo from '../assets/muchas_logo.png';
import { cn } from '../lib/utils';
import { TermsAndConditions } from './TermsAndConditions';

interface UsernameModalProps {
  onUsernameSet: (username: string) => void;
}

export const UsernameModal: React.FC<UsernameModalProps> = ({ onUsernameSet }) => {
  const [username, setUsername] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    const storedTermsAccepted = localStorage.getItem('termsAccepted') === 'true';
    
    if (!storedUsername || !storedTermsAccepted) {
      setShowModal(true);
      // If username exists but terms not accepted, pre-fill username
      if (storedUsername) {
        setUsername(storedUsername);
      }
    } else {
      onUsernameSet(storedUsername);
    }
  }, [onUsernameSet]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (username.trim() && acceptedTerms) {
      const trimmedUsername = username.trim();
      localStorage.setItem('username', trimmedUsername);
      localStorage.setItem('termsAccepted', 'true');
      onUsernameSet(trimmedUsername);
      setShowModal(false);
    }
  };

  if (!showModal) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-tropical-dark)]/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-[var(--color-tropical-sand)] shadow-2xl border-4 border-[var(--color-tropical-gold)]"
        >
          {/* Decorative background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-tropical-gold)]/5 via-transparent to-[var(--color-tropical-orange)]/5 pointer-events-none" />
          
          {/* Animated radio waves */}
          <div className="absolute top-0 right-0 w-40 h-40 opacity-5 pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute top-0 right-0 rounded-full border-2 border-[var(--color-tropical-gold)]"
                initial={{ width: 0, height: 0, opacity: 0.6 }}
                animate={{
                  width: [0, 160],
                  height: [0, 160],
                  opacity: [0.6, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.7,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>

          <div className="relative z-10 p-8 text-center">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 15, delay: 0.2 }}
              className="mb-6"
            >
              <img
                src={muchasLogo}
                alt="Muchas Radio"
                className="w-32 h-auto mx-auto filter drop-shadow-lg"
              />
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-2"
            >
              <h2 className="text-3xl font-bold text-[var(--color-tropical-dark)] mb-2">
                Welcome to Muchas Radio!
              </h2>
              <div className="flex items-center justify-center gap-2 text-[var(--color-tropical-orange)] font-medium text-lg">
                <Radio className="w-5 h-5" />
                <p className="italic">Your Tropical Radio Station 🌴</p>
              </div>
            </motion.div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-[var(--color-text-muted)] mb-8 text-sm leading-relaxed"
            >
              A collaborative radio where everyone listens together.
              <br />
              Upload tracks, join the party, and enjoy the vibes! 🎧
            </motion.p>

            {/* Form */}
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-tropical-gold)]">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  maxLength={20}
                  required
                  autoFocus
                  className={cn(
                    'w-full pl-12 pr-4 py-4 rounded-xl',
                    'border-2 border-black/10 bg-white/80',
                    'text-[var(--color-tropical-dark)] placeholder:text-[var(--color-text-muted)]',
                    'focus:outline-none focus:border-[var(--color-tropical-gold)] focus:ring-4 focus:ring-[var(--color-tropical-gold)]/20',
                    'transition-all duration-200',
                    'font-medium'
                  )}
                />
              </div>

              {/* Terms and Conditions Checkbox */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-white/60 border-2 border-black/5"
              >
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-2 border-[var(--color-tropical-gold)] text-[var(--color-tropical-gold)] focus:ring-2 focus:ring-[var(--color-tropical-gold)]/20 cursor-pointer"
                  required
                />
                <label
                  htmlFor="acceptTerms"
                  className="flex-1 text-sm text-[var(--color-tropical-dark)] cursor-pointer leading-relaxed"
                >
                  I accept the{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowTermsModal(true);
                    }}
                    className="text-[var(--color-tropical-orange)] font-semibold underline hover:text-[var(--color-tropical-gold)] transition-colors inline-flex items-center gap-1"
                  >
                    Terms and Conditions
                    <FileText className="w-3 h-3" />
                  </button>
                </label>
              </motion.div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'w-full py-4 px-6 rounded-xl',
                  'bg-gradient-to-r from-[var(--color-tropical-gold)] to-[var(--color-tropical-orange)]',
                  'text-white font-bold text-lg',
                  'shadow-lg hover:shadow-xl',
                  'transition-all duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                disabled={!username.trim() || !acceptedTerms}
              >
                Start Listening 🎵
              </motion.button>
            </motion.form>

            {/* Hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xs text-[var(--color-text-muted)] mt-6"
            >
              Your username will be visible when you upload tracks
            </motion.p>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Terms and Conditions Modal */}
      <TermsAndConditions isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
    </AnimatePresence>
  );
};
