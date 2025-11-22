import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { getStreamUrl } from '../api/client';
import { cn } from '../lib/utils';

interface PlayerProps {
  isPlaying?: boolean;
}

export const Player: React.FC<PlayerProps> = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [userStarted, setUserStarted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleWaiting = () => {
      console.log('Audio: waiting for data');
      setIsBuffering(true);
    };
    const handleCanPlay = () => {
      console.log('Audio: can play');
      setIsBuffering(false);
    };
    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      console.error('Audio error details:', audio.error);
      setHasError(true);
      setIsBuffering(false);
    };
    const handleLoadStart = () => {
      console.log('Audio: load start');
      setHasError(false);
      setIsBuffering(true);
    };
    const handlePlaying = () => {
      console.log('Audio: playing!');
      setIsBuffering(false);
      setHasError(false);
    };
    const handleLoadedData = () => {
      console.log('Audio: loaded data');
    };
    const handleCanPlayThrough = () => {
      console.log('Audio: can play through');
      setIsBuffering(false);
    };
    const handleStalled = () => {
      console.log('Audio: stalled');
    };
    const handleSuspend = () => {
      console.log('Audio: suspend');
    };

    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('suspend', handleSuspend);

    return () => {
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('suspend', handleSuspend);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handlePlay = () => {
    if (audioRef.current) {
      console.log('User clicked play, stream URL:', getStreamUrl());
      setUserStarted(true);
      setIsBuffering(true);
      
      // Set the source and load the stream
      audioRef.current.src = getStreamUrl();
      audioRef.current.load();
      
      // Small delay to ensure load is initiated
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch((err) => {
            console.error('Failed to play:', err);
            setHasError(true);
            setIsBuffering(false);
          });
        }
      }, 100);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setUserStarted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-xl border border-white/20 shadow-2xl p-8"
    >
      {/* Decorative background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-tropical-gold)]/5 via-transparent to-[var(--color-tropical-orange)]/5 pointer-events-none" />
      
      {/* Animated radio waves when playing */}
      {userStarted && !hasError && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--color-tropical-gold)]"
              initial={{ width: 0, height: 0, opacity: 0.6 }}
              animate={{
                width: [0, 400],
                height: [0, 400],
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
      )}

      <audio
        ref={audioRef}
        src={userStarted ? getStreamUrl() : undefined}
        autoPlay={false}
        preload="auto"
        crossOrigin="anonymous"
      />
      
      <div className="relative z-10">
        {/* Main play/pause button */}
        <div className="flex justify-center mb-6">
          <motion.button
            onClick={userStarted ? handleStop : handlePlay}
            disabled={isBuffering}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'relative group flex items-center justify-center gap-3 px-12 py-5 rounded-full',
              'font-semibold text-lg transition-all duration-300',
              'shadow-lg hover:shadow-xl',
              userStarted
                ? 'bg-gradient-to-r from-[var(--color-tropical-orange)] to-[var(--color-accent-dark)] text-white'
                : 'bg-gradient-to-r from-[var(--color-tropical-gold)] to-[var(--color-primary-dark)] text-[var(--color-tropical-dark)]',
              isBuffering && 'opacity-70 cursor-not-allowed'
            )}
          >
            {isBuffering ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full"
                />
                <span>Buffering...</span>
              </>
            ) : userStarted ? (
              <>
                <Pause className="w-6 h-6 fill-current" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Play className="w-6 h-6 fill-current" />
                <span>Start Listening</span>
              </>
            )}
          </motion.button>
        </div>

        {/* Volume control */}
        {userStarted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-center gap-4 mt-6"
          >
            <button
              onClick={toggleMute}
              className="p-2 rounded-lg hover:bg-black/5 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-[var(--color-tropical-dark)]" />
              ) : (
                <Volume2 className="w-5 h-5 text-[var(--color-tropical-dark)]" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const newVolume = parseFloat(e.target.value);
                setVolume(newVolume);
                if (newVolume > 0 && isMuted) setIsMuted(false);
              }}
              className="w-32 h-2 rounded-full appearance-none bg-black/10 accent-[var(--color-tropical-gold)] cursor-pointer"
            />
          </motion.div>
        )}

        {/* Status indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mt-6"
        >
          {hasError && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Stream error - Check if MPD is running
            </div>
          )}
          {userStarted && !isBuffering && !hasError && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 bg-green-500 rounded-full"
              />
              Live Streaming
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};
