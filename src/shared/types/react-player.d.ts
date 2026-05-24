declare module 'react-player' {
  import * as React from 'react';

  interface ReactPlayerProps {
    url: string;
    playing?: boolean;
    loop?: boolean;
    controls?: boolean;
    light?: boolean | string;
    volume?: number;
    muted?: boolean;
    playbackRate?: number;
    width?: string | number;
    height?: string | number;
    style?: React.CSSProperties;
    progressInterval?: number;
    playsinline?: boolean;
    pip?: boolean;
    stopOnUnmount?: boolean;
    fallback?: React.ReactElement;
    wrapper?: React.ComponentType<{ children: React.ReactNode }>;
    config?: {
      youtube?: {
        playerVars?: Record<string, number | string>;
        embedOptions?: Record<string, unknown>;
      };
      [key: string]: unknown;
    };
    onReady?: (player: ReactPlayer) => void;
    onStart?: () => void;
    onPlay?: () => void;
    onPause?: () => void;
    onBuffer?: () => void;
    onBufferEnd?: () => void;
    onEnded?: () => void;
    onError?: (error: Error, data?: unknown, hlsInstance?: unknown, hlsGlobal?: unknown) => void;
    onDuration?: (duration: number) => void;
    onSeek?: (seconds: number) => void;
    onProgress?: (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => void;
    onClickPreview?: (event: React.MouseEvent<HTMLDivElement>) => void;
    onEnablePIP?: () => void;
    onDisablePIP?: () => void;
  }

  class ReactPlayer extends React.Component<ReactPlayerProps> {
    getCurrentTime(): number;
    getDuration(): number;
    getInternalPlayer(): HTMLVideoElement | HTMLAudioElement | unknown;
    seekTo(amount: number, type?: 'seconds' | 'fraction'): void;
  }

  export = ReactPlayer;
}
