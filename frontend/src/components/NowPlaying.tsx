import { motion, AnimatePresence } from 'framer-motion';
import { Music, User, Disc3 } from 'lucide-react';
import type { CurrentTrack } from '../types';
import { cn } from '../lib/utils';
import { formatTime } from '../lib/utils';

interface NowPlayingProps {
  currentTrack: CurrentTrack | undefined;
  isLoading: boolean;
}

export const NowPlaying: React.FC<NowPlayingProps> = ({ currentTrack, isLoading }) => {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-xl border border-white/20 shadow-2xl p-8"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-black/5 rounded-lg w-3/4" />
          <div className="h-6 bg-black/5 rounded-lg w-1/2" />
          <div className="h-4 bg-black/5 rounded-lg w-1/3" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-xl border border-white/20 shadow-2xl p-8"
    >
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-tropical-gold)]/10 via-transparent to-[var(--color-tropical-orange)]/10 pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--color-tropical-gold)] to-[var(--color-tropical-orange)]">
            <Music className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-tropical-dark)]">
            Now Playing
          </h2>
        </div>

        <AnimatePresence mode="wait">
          {currentTrack?.track ? (
            <motion.div
              key={currentTrack.track.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Track title with vinyl animation */}
              <div className="flex items-start gap-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="flex-shrink-0"
                >
                  <Disc3 className="w-12 h-12 text-[var(--color-tropical-gold)]" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-3xl font-bold text-[var(--color-tropical-dark)] mb-2 break-words">
                    {currentTrack.track.title || 'Unknown Track'}
                  </h3>
                  {currentTrack.track.artist && (
                    <p className="text-xl text-[var(--color-text-muted)] mb-1">
                      {currentTrack.track.artist}
                    </p>
                  )}
                  {currentTrack.track.album && (
                    <p className="text-base text-[var(--color-text-muted)] italic">
                      {currentTrack.track.album}
                    </p>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {currentTrack.track.duration && currentTrack.elapsed !== null && (
                <div className="space-y-2">
                  <div className="relative h-2 bg-black/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(currentTrack.elapsed / currentTrack.track.duration) * 100}%`,
                      }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--color-tropical-gold)] to-[var(--color-tropical-orange)] rounded-full"
                    />
                  </div>
                  <div className="flex justify-between text-sm text-[var(--color-text-muted)]">
                    <span>{formatTime(currentTrack.elapsed)}</span>
                    <span>{formatTime(currentTrack.track.duration)}</span>
                  </div>
                </div>
              )}

              {/* Meta information */}
              <div className="flex items-center justify-between pt-4 border-t border-black/5">
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                  <User className="w-4 h-4" />
                  <span>Added by {currentTrack.track.added_by || 'Unknown'}</span>
                </div>
                <div
                  className={cn(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide',
                    currentTrack.state === 'playing' &&
                      'bg-green-100 text-green-700 border border-green-200',
                    currentTrack.state === 'paused' &&
                      'bg-yellow-100 text-yellow-700 border border-yellow-200',
                    currentTrack.state === 'stopped' &&
                      'bg-red-100 text-red-700 border border-red-200'
                  )}
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      currentTrack.state === 'playing' && 'bg-green-500 animate-pulse',
                      currentTrack.state === 'paused' && 'bg-yellow-500',
                      currentTrack.state === 'stopped' && 'bg-red-500'
                    )}
                  />
                  {currentTrack.state}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="p-4 rounded-full bg-black/5 mb-4">
                <Music className="w-12 h-12 text-[var(--color-text-muted)]" />
              </div>
              <p className="text-lg text-[var(--color-text-muted)] italic">
                No track is currently playing
              </p>
              <p className="text-sm text-[var(--color-text-muted)] mt-2">
                Upload a song to get the party started! 🎵
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
