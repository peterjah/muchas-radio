import { useState, useRef, type DragEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Music, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadMusic } from '../api/client';
import { cn } from '../lib/utils';

export const UploadForm: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: uploadMusic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.success('Track will play next!', {
        description: 'Your music is up next 🎵',
        duration: 4000,
      });
    },
    onError: (error: any) => {
      console.error('Upload failed:', error);
      toast.error('Upload failed', {
        description: error.response?.data?.error || error.message,
        duration: 5000,
      });
    },
  });

  const handleFile = (file: File) => {
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/ogg', 'audio/m4a', 'audio/wav'];
    const validExtensions = ['.mp3', '.flac', '.ogg', '.m4a', '.wav'];
    
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (!validTypes.includes(file.type) && !hasValidExtension) {
      toast.error('Invalid file type', {
        description: 'Please upload MP3, FLAC, OGG, M4A, or WAV files.',
      });
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Maximum file size is 100MB.',
      });
      return;
    }

    toast.info('Uploading...', {
      description: `Uploading ${file.name}`,
      duration: 2000,
    });
    uploadMutation.mutate(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    if (!uploadMutation.isPending) {
      fileInputRef.current?.click();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-xl border border-white/20 shadow-2xl p-8"
    >
      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-tropical-gold)]/10 via-transparent to-[var(--color-tropical-orange)]/10 pointer-events-none" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--color-tropical-gold)] to-[var(--color-tropical-orange)]">
            <Upload className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-tropical-dark)]">
            Put the Next Track
          </h2>
        </div>

        {/* Upload dropzone */}
        <motion.div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          whileHover={!uploadMutation.isPending ? { scale: 1.01 } : {}}
          className={cn(
            'relative overflow-hidden rounded-xl border-3 border-dashed transition-all duration-300 cursor-pointer',
            'min-h-[240px] flex items-center justify-center',
            isDragging
              ? 'border-[var(--color-tropical-gold)] bg-[var(--color-tropical-gold)]/10'
              : 'border-black/10 bg-[var(--color-tropical-sand)]/30 hover:border-[var(--color-tropical-gold)]/50 hover:bg-[var(--color-tropical-sand)]/50',
            uploadMutation.isPending && 'cursor-not-allowed opacity-70'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.flac,.ogg,.m4a,.wav,audio/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploadMutation.isPending}
          />

          <AnimatePresence mode="wait">
            {uploadMutation.isPending ? (
              <motion.div
                key="uploading"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-4 text-center px-6"
              >
                <Loader2 className="w-16 h-16 text-[var(--color-tropical-gold)] animate-spin" />
                <div>
                  <p className="text-lg font-semibold text-[var(--color-tropical-dark)] mb-1">
                    Uploading...
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Adding your track as the next track
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-4 text-center px-6"
              >
                <motion.div
                  animate={isDragging ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.3, repeat: isDragging ? Infinity : 0 }}
                  className={cn(
                    'p-4 rounded-2xl transition-all duration-300',
                    isDragging
                      ? 'bg-gradient-to-br from-[var(--color-tropical-gold)] to-[var(--color-tropical-orange)] shadow-lg'
                      : 'bg-gradient-to-br from-[var(--color-tropical-gold)]/20 to-[var(--color-tropical-orange)]/20'
                  )}
                >
                  <Music className={cn(
                    'w-12 h-12 transition-colors',
                    isDragging ? 'text-white' : 'text-[var(--color-tropical-gold)]'
                  )} />
                </motion.div>
                
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-[var(--color-tropical-dark)]">
                    {isDragging ? (
                      '🎵 Drop it here!'
                    ) : (
                      <>
                        Drop a music file here
                      </>
                    )}
                  </p>
                  {!isDragging && (
                    <p className="text-sm text-[var(--color-text-muted)]">
                      or <span className="text-[var(--color-tropical-gold)] font-medium">click to browse</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {['MP3', 'FLAC', 'OGG', 'M4A', 'WAV'].map((format) => (
                    <span
                      key={format}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-black/5 text-[var(--color-text-muted)]"
                    >
                      {format}
                    </span>
                  ))}
                </div>
                
                <p className="text-xs text-[var(--color-text-muted)] mt-2">
                  Maximum file size: 100MB
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Success/Error indicators with icons */}
        <AnimatePresence>
          {uploadMutation.isSuccess && !uploadMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200"
            >
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-800">Upload successful!</p>
                <p className="text-xs text-green-700">Your track will play next!</p>
              </div>
            </motion.div>
          )}
          
          {uploadMutation.isError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200"
            >
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">Upload failed</p>
                <p className="text-xs text-red-700">Please try again</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
