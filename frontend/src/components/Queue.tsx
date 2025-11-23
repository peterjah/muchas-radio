import { motion, AnimatePresence } from 'framer-motion';
import { ListMusic, Music2, Clock, User } from 'lucide-react';
import type { QueueItem } from '../types';
import { cn } from '../lib/utils';
import { formatTime } from '../lib/utils';

interface QueueProps {
  queue: QueueItem[];
  isLoading: boolean;
}

export const Queue: React.FC<QueueProps> = ({ queue, isLoading }) => {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-xl border border-white/20 shadow-2xl p-6 max-h-[calc(100vh-120px)]"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-black/5 rounded-lg w-1/2" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-black/5 rounded-lg" />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-xl border border-white/20 shadow-2xl p-6 max-h-[calc(100vh-120px)] flex flex-col"
    >
      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-tropical-gold)]/10 via-transparent to-[var(--color-tropical-orange)]/10 pointer-events-none" />
      
      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 flex-shrink-0">
          <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--color-tropical-gold)] to-[var(--color-tropical-orange)]">
            <ListMusic className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-[var(--color-tropical-dark)]">
              Coming Up
            </h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              {queue.length} {queue.length === 1 ? 'track' : 'tracks'} in queue
            </p>
          </div>
        </div>

        {/* Queue list */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {queue.length > 0 ? (
              queue.map((item, index) => (
                <motion.div
                  key={item.track.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  className={cn(
                    'group relative flex items-start gap-4 p-4 rounded-xl',
                    'bg-gradient-to-r from-[var(--color-tropical-sand)]/60 to-transparent',
                    'border-l-4 border-transparent',
                    'hover:border-[var(--color-tropical-gold)]',
                    'hover:shadow-md',
                    'transition-all duration-200'
                  )}
                >
                  {/* Position number with gradient background */}
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-tropical-gold)] to-[var(--color-tropical-orange)] rounded-lg blur-sm opacity-50 group-hover:opacity-75 transition-opacity" />
                      <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--color-tropical-gold)] to-[var(--color-tropical-orange)] text-white font-bold text-lg">
                        {item.position}
                      </div>
                    </div>
                  </div>

                  {/* Track info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <Music2 className="w-4 h-4 text-[var(--color-tropical-gold)] flex-shrink-0 mt-1" />
                      <h3 className="font-semibold text-[var(--color-tropical-dark)] text-sm leading-tight break-words">
                        {item.track.title || 'Unknown Track'}
                      </h3>
                    </div>
                    
                    {item.track.artist && (
                      <p className="text-xs text-[var(--color-text-muted)] mb-2 pl-6">
                        {item.track.artist}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] pl-6">
                      {item.track.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(item.track.duration)}</span>
                        </div>
                      )}
                      {item.track.added_by && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span className="truncate max-w-[100px]">{item.track.added_by}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hover effect indicator */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    whileHover={{ opacity: 1, scale: 1 }}
                    className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-[var(--color-tropical-gold)] to-[var(--color-tropical-orange)] rounded-full"
                  />
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="p-4 rounded-full bg-black/5 mb-4">
                  <ListMusic className="w-12 h-12 text-[var(--color-text-muted)]" />
                </div>
                <p className="text-base text-[var(--color-text-muted)] italic">
                  Queue is empty
                </p>
                <p className="text-sm text-[var(--color-text-muted)] mt-2">
                  Upload tracks to build the queue! 🎶
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
