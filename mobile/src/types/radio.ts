export interface LiveStream {
  url: string;
  title: string;
  artist: string;
  isLive: boolean;
}

export interface RadioCurrent {
  track: {
    id: string;
    title: string;
    artist: string;
    cover_url: string;
    stream_url: string;
    duration: number;
  } | null;
  is_live: boolean;
}
