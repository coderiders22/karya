/**
 * The notification sound: a short, soft two-note chime, made with Web Audio so there is
 * no audio file to load. Browsers only allow sound after the person has clicked or typed
 * on the page once, so the audio context is unlocked on the first interaction.
 */
const KEY = "karya:sound";
let ctx: AudioContext | null = null;

export function soundEnabled() {
  try { return localStorage.getItem(KEY) !== "off"; } catch { return true; }
}
export function setSoundEnabled(on: boolean) {
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch {}
}

function context() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  return ctx;
}

/** Call once on mount: the first click or key press unlocks audio for the rest of the visit. */
export function unlockAudioOnInteraction() {
  const unlock = () => { context()?.resume().catch(() => {}); };
  window.addEventListener("pointerdown", unlock, { once: true, capture: true });
  window.addEventListener("keydown", unlock, { once: true, capture: true });
}

export function playChime(force = false) {
  if (!force && !soundEnabled()) return;
  const ac = context();
  if (!ac || ac.state !== "running") return;
  const t = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = 0.16;
  out.connect(ac.destination);
  // Two notes a fifth apart, each with a quick attack and a soft tail.
  [[659.25, 0], [987.77, 0.11]].forEach(([freq, at]) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t + at);
    g.gain.linearRampToValueAtTime(1, t + at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + at + 0.45);
    osc.connect(g).connect(out);
    osc.start(t + at);
    osc.stop(t + at + 0.5);
  });
}
