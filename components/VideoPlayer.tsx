import React from 'react';
import { Download, Film } from 'lucide-react';

interface VideoPlayerProps {
  uri: string | null;
  aspectRatio: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ uri, aspectRatio }) => {
  const containerClasses = aspectRatio === '9:16'
    ? "aspect-[9/16] h-full max-h-[80vh] w-auto mx-auto"
    : "aspect-[16/9] w-full";

  if (!uri) {
    return (
      <div className={`
        flex flex-col items-center justify-center text-zinc-700 border border-dashed border-zinc-800 bg-zinc-950/50
        ${aspectRatio === '9:16' ? 'aspect-[9/16] h-[500px] w-auto' : 'aspect-[16/9] w-full'}
      `}>
        <Film className="w-8 h-8 mb-4 opacity-50" />
        <p className="text-xs font-mono uppercase tracking-widest">Waiting for input</p>
      </div>
    );
  }

  return (
    <div className={`relative group bg-zinc-900 border border-zinc-800 ${containerClasses}`}>
      <video
        className="w-full h-full object-contain"
        controls
        autoPlay
        loop
        playsInline
        src={uri}
      >
        Your browser does not support the video tag.
      </video>

      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <a
          href={uri}
          download="veo-scene.mp4"
          className="flex items-center gap-2 bg-black text-white px-4 py-2 text-xs font-medium border border-zinc-700 hover:bg-zinc-900 transition-colors"
        >
          <Download className="w-3 h-3" />
          <span>DOWNLOAD MP4</span>
        </a>
      </div>
    </div>
  );
};
