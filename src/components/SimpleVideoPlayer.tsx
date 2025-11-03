import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Progress } from '@/components/ui/progress';

interface SimpleVideoPlayerProps {
  src: string;
  poster?: string;
  autoplay?: boolean;
  className?: string;
}

export const SimpleVideoPlayer = ({ src, poster, autoplay = false, className = "" }: SimpleVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    const isHLS = src.endsWith('.m3u8') || src.includes('m3u8');

    if (isHLS) {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoplay) {
            video.play();
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('Network error', data);
                hls?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Media error', data);
                hls?.recoverMediaError();
                break;
              default:
                console.error('Fatal error', data);
                hls?.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        if (autoplay) {
          video.play();
        }
      }
    } else {
      video.src = src;
      if (autoplay) {
        video.play();
      }
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.duration > 0) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };
    
    const handleDurationChange = () => setDuration(video.duration);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);

    return () => {
      if (hls) {
        hls.destroy();
      }
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
    };
  }, [src, autoplay]);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`relative bg-black ${className}`}>
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain"
      />
      
      {/* Bottom Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <div className="flex items-center gap-3">
          <span className="text-white text-sm font-mono">
            {formatTime(currentTime)}
          </span>
          <Progress value={progress} className="flex-1 h-2" />
          <span className="text-white text-sm font-mono">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};
