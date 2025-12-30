import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { getStreamUrl, type StreamQuality } from '../api/client';
import { useRadio } from '../hooks/useRadio';
import { cn } from '../lib/utils';

interface PlayerProps {
  isPlaying?: boolean;
}

const STREAM_QUALITY_KEY = 'muchas-radio-stream-quality';

export const Player: React.FC<PlayerProps> = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userStarted, setUserStarted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  
  // Load quality preference from localStorage, default to 'medium'
  const [quality, setQuality] = useState<StreamQuality>(() => {
    const saved = localStorage.getItem(STREAM_QUALITY_KEY);
    if (saved === 'low' || saved === 'medium' || saved === 'high') {
      return saved as StreamQuality;
    }
    return 'medium';
  });
  
  const { queue, currentTrack } = useRadio();

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
      
      // Check for format errors (especially important for iOS)
      if (audio.error) {
        const errorCode = audio.error.code;
        // MediaError codes: 1=ABORTED, 2=NETWORK, 3=DECODE, 4=SRC_NOT_SUPPORTED
        if (errorCode === 4 || errorCode === 3) {
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          if (isIOS) {
            setErrorMessage('Audio format not supported on iOS. The stream may need to be MP3 format. Try the "128 kbps" quality setting.');
          } else {
            setErrorMessage('Audio format not supported. Please try a different quality setting.');
          }
          return;
        } else if (errorCode === 2) {
          setErrorMessage('Network error. Please check your connection and try again.');
          return;
        }
      }
      
      // Set a helpful error message based on queue status
      if (queue.length === 0) {
        setErrorMessage('No music in queue. Please upload and add music to the queue first.');
      } else {
        setErrorMessage('Stream error. Please check if music is playing.');
      }
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

  // Media Session API for Android notification
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const audio = audioRef.current;
    if (!audio) return;

    // Set up Media Session metadata
    const updateMetadata = () => {
      if (currentTrack?.track) {
        const track = currentTrack.track;
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title || 'Muchas Radio',
          artist: track.artist || 'Live Stream',
          album: track.album || 'Muchas Radio',
        });
      } else {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Muchas Radio',
          artist: 'Live Stream',
        });
      }
    };

    // Update position state for notification
    const updatePositionState = () => {
      if (audio && !audio.paused && !isNaN(audio.currentTime) && isFinite(audio.currentTime) && audio.currentTime >= 0) {
        try {
          const duration = currentTrack?.track?.duration;
          navigator.mediaSession.setPositionState({
            duration: duration && duration > 0 ? duration : Infinity,
            playbackRate: 1.0,
            position: audio.currentTime,
          });
        } catch (e) {
          // Some browsers may not support setPositionState
          console.debug('MediaSession setPositionState not supported:', e);
        }
      }
    };

    // Handle Media Session actions
    navigator.mediaSession.setActionHandler('play', () => {
      if (audio && audio.paused) {
        audio.play().catch(console.error);
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      if (audio && !audio.paused) {
        audio.pause();
      }
    });

    // Update metadata when track changes or playback starts
    updateMetadata();

    // Update position state periodically
    const positionInterval = setInterval(() => {
      if (userStarted && audio && !audio.paused) {
        updatePositionState();
      } else if (audio.paused || !userStarted) {
        // Don't clear, just don't update - the position should remain visible
      }
    }, 500); // Update every 500ms for smoother updates

    // Also update on timeupdate event for more accuracy
    const handleTimeUpdate = () => {
      if (userStarted && !audio.paused) {
        updatePositionState();
      }
    };

    // Update when playback state changes
    const handlePlay = () => {
      updateMetadata();
      updatePositionState();
    };

    const handlePause = () => {
      // Keep position state visible but paused
      updatePositionState();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      clearInterval(positionInterval);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [userStarted, currentTrack]);

  const handlePlay = async () => {
    // Check if queue is empty before attempting to play
    if (queue.length === 0) {
      setHasError(true);
      setErrorMessage('No music in queue. Please upload and add music to the queue first.');
      return;
    }

    if (audioRef.current) {
      console.log('User clicked play, stream URL:', getStreamUrl(quality));
      setUserStarted(true);
      setIsBuffering(true);
      setHasError(false);
      setErrorMessage(null);
      
      const audio = audioRef.current;
      const streamUrl = getStreamUrl(quality);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      // For iOS, we need to ensure the audio element is properly configured
      // before setting the source
      audio.crossOrigin = 'anonymous';
      
      // Set the source and load the stream
      audio.src = streamUrl;
      
      // Clear any previous errors
      audio.load();
      
      // iOS Safari/Chrome requires the audio element to be ready before calling play()
      // Real iOS devices are stricter and need more time to detect the format
      const playAudio = (retryCount = 0) => {
        if (!audio || !audioRef.current) return;
        
        // On real iOS devices, we need to wait longer for format detection
        // Check if we have enough data loaded
        const hasEnoughData = audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
        const shouldWaitForMoreData = isIOS && !hasEnoughData && retryCount < 2;
        
        if (shouldWaitForMoreData) {
          console.log(`[Player] iOS: Waiting for more data, readyState: ${audio.readyState}`);
          setTimeout(() => {
            if (audio && audioRef.current && audio.src === streamUrl) {
              playAudio(retryCount + 1);
            }
          }, 500);
          return;
        }
        
        // On iOS, sometimes we need to wait a bit longer even after canplay
        const attemptPlay = () => {
          const playPromise = audio.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('Playback started successfully');
                setIsBuffering(false);
                setHasError(false);
              })
              .catch((err) => {
                console.error('Failed to play:', err);
                console.error('Audio readyState:', audio.readyState);
                console.error('Audio error:', audio.error);
                
                // Retry for certain errors or if audio isn't ready yet
                // Real iOS devices might need more retries
                const maxRetries = isIOS ? 5 : 3;
                const shouldRetry = retryCount < maxRetries && (
                  err?.name === 'NotAllowedError' || 
                  err?.message?.includes('play() request was interrupted') ||
                  err?.message?.includes('The play() request was interrupted') ||
                  audio.readyState === HTMLMediaElement.HAVE_NOTHING ||
                  (audio.readyState < HTMLMediaElement.HAVE_CURRENT_DATA && retryCount < 3)
                );
                
                if (shouldRetry) {
                  // iOS needs longer delays between retries
                  const baseDelay = isIOS ? 300 : 100;
                  const delay = retryCount === 0 ? baseDelay : retryCount === 1 ? (baseDelay * 3) : (baseDelay * 5);
                  console.log(`[Player] Retrying play attempt ${retryCount + 1} in ${delay}ms...`);
                  setTimeout(() => {
                    if (audio && audioRef.current && audio.src === streamUrl) {
                      playAudio(retryCount + 1);
                    }
                  }, delay);
                  return;
                }
                
                setHasError(true);
                setIsBuffering(false);
                
                // Provide better error messages based on error type
                const errorName = err?.name || '';
                const errorMessage = err?.message || '';
                
                // Check audio element state for more info (this is especially important for iOS)
                let formatError = false;
                if (audio.error) {
                  const errorCode = audio.error.code;
                  // MediaError codes: 1=ABORTED, 2=NETWORK, 3=DECODE, 4=SRC_NOT_SUPPORTED
                  if (errorCode === 4 || errorCode === 3) {
                    formatError = true;
                  }
                }
                
                if (errorName === 'NotAllowedError' || errorMessage.includes('play() request was interrupted')) {
                  setErrorMessage('Playback was blocked. Please tap the play button again.');
                } else if (errorName === 'NotSupportedError' || formatError) {
                  // iOS-specific: Try suggesting lower quality or checking stream format
                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                  if (isIOS) {
                    setErrorMessage('Audio format not supported on iOS. Try the "128 kbps" quality setting, or ensure the stream is MP3 format.');
                  } else {
                    setErrorMessage('Audio format not supported. Please try a different quality setting.');
                  }
                } else if (queue.length === 0) {
                  setErrorMessage('No music in queue. Please upload and add music to the queue first.');
                } else {
                  // Check audio element state for more info
                  if (audio.error) {
                    const errorCode = audio.error.code;
                    if (errorCode === 2) {
                      setErrorMessage('Network error. Please check your connection and try again.');
                    } else {
                      setErrorMessage('Failed to start playback. Please check if music is in the queue.');
                    }
                  } else {
                    setErrorMessage('Failed to start playback. Please check if music is in the queue.');
                  }
                }
              });
          }
        };
        
        // Small delay for iOS to ensure audio element is fully ready
        if (retryCount === 0) {
          setTimeout(attemptPlay, 50);
        } else {
          attemptPlay();
        }
      };
      
      // Try playing immediately - browser will load in background
      // This works better on desktop browsers that suspend loading
      // For iOS, we'll retry if it fails
      playAudio();
      
      // Also listen for canplay as backup (especially for iOS)
      // Real iOS devices might need loadedmetadata or loadeddata events
      const onCanPlay = () => {
        console.log('[Player] ✅ canplay event fired, readyState:', audio.readyState);
        // If still paused, try playing again
        if (audio.paused && !hasError) {
          // On iOS, wait a bit more even after canplay
          const delay = isIOS ? 200 : 0;
          setTimeout(() => {
            if (audio && audio.paused && !hasError) {
              playAudio(1);
            }
          }, delay);
        }
      };
      
      // For iOS, also listen to loadedmetadata and loadeddata
      const onLoadedData = () => {
        console.log('[Player] ✅ loadeddata event fired, readyState:', audio.readyState);
        if (isIOS && audio.paused && !hasError) {
          // Give iOS a moment to process the format
          setTimeout(() => {
            if (audio && audio.paused && !hasError) {
              playAudio(1);
            }
          }, 300);
        }
      };
      
      audio.addEventListener('canplay', onCanPlay, { once: true });
      audio.addEventListener('canplaythrough', onCanPlay, { once: true });
      if (isIOS) {
        audio.addEventListener('loadedmetadata', onLoadedData, { once: true });
        audio.addEventListener('loadeddata', onLoadedData, { once: true });
      }
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

  const handleQualityChange = (newQuality: StreamQuality) => {
    if (newQuality === quality) return;
    
    // Save to localStorage
    localStorage.setItem(STREAM_QUALITY_KEY, newQuality);
    setQuality(newQuality);
    
    // If currently playing, restart with new quality
    if (userStarted && audioRef.current) {
      const audio = audioRef.current;
      const wasPlaying = !audio.paused;
      audio.src = getStreamUrl(newQuality);
      audio.load();
      
      if (wasPlaying) {
        // Wait for audio to be ready before playing (iOS Safari requirement)
        const playAudio = () => {
          if (!audio) return;
          audio.play().catch((err) => {
            console.error('Failed to play after quality change:', err);
            setHasError(true);
            setErrorMessage('Failed to switch quality. Please try again.');
          });
        };
        
        if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
          playAudio();
        } else {
          const onCanPlay = () => {
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('canplaythrough', onCanPlay);
            playAudio();
          };
          
          audio.addEventListener('canplay', onCanPlay, { once: true });
          audio.addEventListener('canplaythrough', onCanPlay, { once: true });
        }
      }
    }
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
        src={userStarted ? getStreamUrl(quality) : undefined}
        autoPlay={false}
        preload="metadata"
        crossOrigin="anonymous"
        playsInline
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

        {/* Quality selector */}
        <div className="flex items-center justify-center gap-2 mt-4 mb-2">
          <span className="text-sm text-[var(--color-tropical-dark)]/70 font-medium">Quality:</span>
          <div className="flex gap-1 bg-white/50 rounded-lg p-1">
            {(['low', 'medium', 'high'] as StreamQuality[]).map((q) => (
              <button
                key={q}
                onClick={() => handleQualityChange(q)}
                className={cn(
                  'px-3 py-1 rounded text-sm font-medium transition-all',
                  quality === q
                    ? 'bg-[var(--color-tropical-gold)] text-[var(--color-tropical-dark)] shadow-sm'
                    : 'text-[var(--color-tropical-dark)]/60 hover:text-[var(--color-tropical-dark)] hover:bg-white/50'
                )}
              >
                {q === 'low' ? '128 kbps' : q === 'medium' ? '192 kbps' : '320 kbps'}
              </button>
            ))}
          </div>
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-200 text-red-700 text-sm font-medium max-w-md text-center">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
              <span>{errorMessage || 'Stream error - Check if MPD is running'}</span>
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
