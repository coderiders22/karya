"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

/**
 * Landing product glimpse. The whole app plays by itself inside a window, sound off, with the
 * pause and sound controls in the window bar so they never cover the product.
 */
export function HeroWalkthrough({ video: name = "walkthrough" }: { video?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pausedByVisitor = useRef(false);
  const [sound, setSound] = useState(false);
  const [paused, setPaused] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const hideCaptions = () => {
      const track = video.textTracks[0];
      if (track) track.mode = "hidden";
    };
    // A refused play() isn't final. Battery saver blocks it until the first touch anywhere on the
    // page, and a play() cut off by loading rejects even though the video then starts by itself.
    const start = () => {
      if (!video.paused || pausedByVisitor.current) return;
      video.play().catch((e: DOMException) => { if (e.name === "NotAllowedError") setNeedsTap(true); });
    };
    const onPlaying = () => { setNeedsTap(false); setPaused(false); };
    const onPause = () => setPaused(true);
    const onVisible = () => { if (!document.hidden) start(); };
    const gestures = ["pointerdown", "touchend", "keydown"];

    hideCaptions();
    video.muted = true;
    video.textTracks.addEventListener("addtrack", hideCaptions);
    video.addEventListener("loadedmetadata", hideCaptions);
    video.addEventListener("canplay", start);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", start);
    gestures.forEach((g) => window.addEventListener(g, start, { passive: true }));
    start();
    return () => {
      video.textTracks.removeEventListener("addtrack", hideCaptions);
      video.removeEventListener("loadedmetadata", hideCaptions);
      video.removeEventListener("canplay", start);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", start);
      gestures.forEach((g) => window.removeEventListener(g, start));
    };
  }, []);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      pausedByVisitor.current = false;
      video.play().catch(() => setNeedsTap(true));
    } else {
      pausedByVisitor.current = true;
      video.pause();
    }
  }

  function toggleSound() {
    const video = videoRef.current;
    if (!video) return;
    const next = !sound;
    video.muted = !next;
    setSound(next);
    if (video.paused) {
      pausedByVisitor.current = false;
      video.play().catch(() => setNeedsTap(true));
    }
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
          <span className="ml-auto flex items-center">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={paused ? "Play the video" : "Pause the video"}
              className="grid size-7 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
            </button>
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={sound}
              aria-label={sound ? "Turn sound off" : "Turn sound on"}
              className="grid size-7 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              {sound ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
          </span>
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
              onClick={togglePlay}
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
