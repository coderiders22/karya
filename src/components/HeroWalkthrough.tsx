"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

/**
 * Landing product glimpse. The whole app plays inside a window, sound off,
 * with the sound control in the window bar so it never covers the product.
 */
export function HeroWalkthrough({ video: name = "walkthrough" }: { video?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sound, setSound] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const hideCaptions = () => {
      const track = video.textTracks[0];
      if (track) track.mode = "hidden";
    };
    hideCaptions();
    video.textTracks.addEventListener("addtrack", hideCaptions);
    video.addEventListener("loadedmetadata", hideCaptions);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stop = () => {
      video.removeEventListener("loadedmetadata", hideCaptions);
      video.textTracks.removeEventListener("addtrack", hideCaptions);
    };
    if (reduced) {
      video.pause();
      setNeedsTap(true);
      return stop;
    }
    video.muted = true;
    hideCaptions();
    video.play().catch(() => setNeedsTap(true));
    return stop;
  }, []);

  function play() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !sound;
    video.play().then(() => setNeedsTap(false)).catch(() => setNeedsTap(true));
  }

  function toggleSound() {
    const video = videoRef.current;
    if (!video) return;
    const next = !sound;
    video.muted = !next;
    setSound(next);
    if (video.paused) video.play().then(() => setNeedsTap(false)).catch(() => setNeedsTap(true));
  }

  return (
    <figure className="relative w-full">
      <figcaption className="sr-only">The Ruvano app, playing with the sound off. Turn sound on with the button on the video.</figcaption>
      <div aria-hidden className="pointer-events-none absolute -inset-x-10 -top-8 bottom-6 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(54,192,159,0.34),transparent_68%)] blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#121211] shadow-[0_50px_100px_-36px_rgba(0,0,0,0.85)] ring-1 ring-inset ring-white/10">
        <div className="grid h-9 grid-cols-[1fr_auto_1fr] items-center border-b border-white/[0.06] bg-white/[0.03] px-3">
          <span className="flex items-center gap-1.5" aria-hidden>
            <span className="size-2 rounded-full bg-white/20" />
            <span className="size-2 rounded-full bg-white/20" />
            <span className="size-2 rounded-full bg-white/20" />
          </span>
          <span className="text-[11px] font-medium tracking-wide text-white/40">ruvano</span>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={sound}
            aria-label={sound ? "Turn sound off" : "Turn sound on"}
            className="ml-auto grid size-7 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            {sound ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
        </div>
        <div className="relative">
          <video
            ref={videoRef}
            muted
            autoPlay
            loop
            playsInline
            preload="auto"
            poster={`/guide/videos/${name}.jpg`}
            className="block aspect-[16/10] h-auto w-full bg-white object-contain"
            aria-label="Ruvano, the whole product, playing with the sound off"
          >
            <source src={`/guide/videos/${name}.mp4`} type="video/mp4" />
            <track kind="captions" src={`/guide/videos/${name}.vtt`} srcLang="en" label="English" />
          </video>
          {needsTap && (
            <button
              type="button"
              onClick={play}
              className="absolute inset-0 grid place-items-center"
              aria-label="Play the product video with the sound off"
            >
              <span className="grid size-16 place-items-center rounded-full bg-brand text-white shadow-xl ring-8 ring-black/10">
                <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg>
              </span>
            </button>
          )}
        </div>
      </div>
    </figure>
  );
}
