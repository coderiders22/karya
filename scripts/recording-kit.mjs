// Shared by the Guide video recorders: a visible cursor, a caption bar, and small helpers for
// moving the mouse and typing like a person. Used by record-guide-videos.mjs and record-walkthrough.mjs.
import path from "path";

/** Cursor + caption overlay, and flags so tours, splash and greetings don't interrupt. */
export const overlay = () => {
  try {
    localStorage.setItem("karya:tour:welcome", "done");
    localStorage.setItem("karya:tour:board", "done");
    sessionStorage.setItem("karya:booted", "1");
    sessionStorage.setItem("karya:greeted", "1");
  } catch {}
  const mount = () => {
    if (document.getElementById("rec-cursor")) return;
    const style = document.createElement("style");
    style.textContent = `
      #rec-cursor{position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-3px,-2px);transition:transform .08s}
      #rec-cursor.down{transform:translate(-3px,-2px) scale(.86)}
      .rec-ripple{position:fixed;z-index:2147483646;pointer-events:none;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;
        border:2px solid #17a383;animation:rec-r .45s ease-out forwards}
      @keyframes rec-r{from{opacity:.9;transform:scale(.3)}to{opacity:0;transform:scale(1.4)}}
      #rec-cap{position:fixed;left:50%;bottom:28px;z-index:2147483645;pointer-events:none;transform:translate(-50%,8px);opacity:0;
        max-width:760px;padding:11px 18px;border-radius:12px;background:rgba(17,17,16,.92);color:#fff;
        font:500 16px/1.4 Inter,system-ui,sans-serif;letter-spacing:-.005em;box-shadow:0 10px 30px -8px rgba(0,0,0,.45);
        transition:opacity .25s,transform .25s}
      #rec-cap.on{opacity:1;transform:translate(-50%,0)}
      #rec-cap.top{top:72px;bottom:auto}
      #rec-mark{position:fixed;left:0;bottom:0;width:8px;height:8px;z-index:2147483647;pointer-events:none;background:#1a1a18}
      #rec-cap b{color:#5fd4b6;font-weight:600}
      #rec-cap .step{display:inline-block;margin-right:10px;padding:1px 9px;border-radius:999px;background:#17a383;color:#fff;font-weight:600;font-size:13px;vertical-align:1px}
      #rec-cap kbd{display:inline-block;min-width:22px;padding:0 6px;margin:0 1px;border:1px solid rgba(255,255,255,.25);border-bottom-width:2px;
        border-radius:5px;font:600 13px/20px Inter,system-ui,sans-serif;text-align:center;background:rgba(255,255,255,.08)}`;
    document.head.appendChild(style);
    const c = document.createElement("div");
    c.id = "rec-cursor";
    c.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 2.5v17.2l4.6-4.4 2.9 6.6 3-1.3-2.9-6.5h6.4z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    document.body.appendChild(c);
    const cap = document.createElement("div");
    cap.id = "rec-cap";
    document.body.appendChild(cap);
    const pos = JSON.parse(sessionStorage.getItem("rec-pos") || "[640,400]");
    c.style.left = pos[0] + "px"; c.style.top = pos[1] + "px";
    addEventListener("mousemove", (e) => { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; sessionStorage.setItem("rec-pos", JSON.stringify([e.clientX, e.clientY])); }, true);
    addEventListener("mousedown", (e) => {
      c.classList.add("down");
      const r = document.createElement("div"); r.className = "rec-ripple"; r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px";
      document.body.appendChild(r); setTimeout(() => r.remove(), 500);
    }, true);
    addEventListener("mouseup", () => c.classList.remove("down"), true);
    window.__cap = (html, top) => { cap.innerHTML = html || ""; cap.classList.toggle("on", !!html); cap.classList.toggle("top", !!top); };
    // Scene marker: a tiny square in the bottom-left corner whose color encodes the scene number.
    // Recordings run a little slower than the clock, so scene times are read back from the video
    // itself (see markerColor / readMarkers). The final encode paints over the square.
    const mark = document.createElement("div");
    mark.id = "rec-mark";
    document.body.appendChild(mark);
    window.__mark = (i) => {
      const [r, g, b] = [40 + (i % 4) * 60, 40 + (Math.floor(i / 4) % 4) * 60, 220 - Math.floor(i / 16) * 60];
      mark.style.background = `rgb(${r},${g},${b})`;
      try { sessionStorage.setItem("rec-mark", String(i)); } catch {}
    };
    const saved = sessionStorage.getItem("rec-mark");
    if (saved != null) window.__mark(Number(saved));
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
};

export function helpers(page, OUT) {
  const wait = (ms) => page.waitForTimeout(ms);
  let at = { x: 640, y: 400 };
  const moveTo = async (target, { dx = 0, dy = 0, steps = 28 } = {}) => {
    const box = typeof target.boundingBox === "function" ? await target.boundingBox() : target;
    const x = box.x + (box.width ?? 0) / 2 + dx, y = box.y + (box.height ?? 0) / 2 + dy;
    await page.mouse.move(x, y, { steps });
    at = { x, y };
  };
  return {
    wait,
    moveTo,
    /** Caption bar at the bottom, or at the top when what we're showing sits at the bottom of the screen. */
    caption: async (html, hold = 0, top = false) => { await page.evaluate(([h, t]) => window.__cap?.(h, t), [html, top]); if (hold) await wait(hold); },
    click: async (loc, opts) => { await loc.scrollIntoViewIfNeeded(); await moveTo(loc, opts); await wait(220); await page.mouse.down(); await wait(70); await page.mouse.up(); },
    type: async (text, delay = 55) => page.keyboard.type(text, { delay }),
    drag: async (from, to) => {
      await moveTo(from); await wait(250);
      await page.mouse.down(); await wait(120);
      await page.mouse.move(at.x + 12, at.y + 6, { steps: 4 });
      const box = await to.boundingBox();
      // A little left of centre: drops at dead centre sometimes landed one column too far right.
      await page.mouse.move(box.x + box.width * 0.4, box.y + 80, { steps: 40 });
      await wait(250); await page.mouse.up();
    },
    poster: (name) => page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 82 }),
  };
}


/** The RGB a scene marker is painted with (must match window.__mark above). */
export const markerColor = (i) => [40 + (i % 4) * 60, 40 + (Math.floor(i / 4) % 4) * 60, 220 - Math.floor(i / 16) * 60];

/**
 * Finds when each scene starts in a recording, by reading the marker square frame by frame.
 * Returns seconds per scene index (null where a marker wasn't found).
 */
export async function readMarkers(ffmpeg, video, count, fps = 25) {
  const { execFileSync } = await import("child_process");
  const buf = execFileSync(ffmpeg, [
    "-hide_banner", "-loglevel", "error", "-i", video,
    "-vf", `fps=${fps},crop=6:6:1:ih-7,scale=1:1:flags=area`, "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1",
  ], { maxBuffer: 1 << 28 });
  const frames = buf.length / 3;
  const is = (k, [r, g, b]) => k < frames && Math.abs(buf[k * 3] - r) < 26 && Math.abs(buf[k * 3 + 1] - g) < 26 && Math.abs(buf[k * 3 + 2] - b) < 26;
  const found = new Array(count).fill(null);
  // Scenes come in order, and a real marker holds its color: look after the previous scene, for
  // three frames in a row, so one stray pixel can't be mistaken for a scene change.
  let from = 0;
  for (let i = 0; i < count; i++) {
    const c = markerColor(i);
    for (let k = from; k < frames; k++) {
      if (is(k, c) && is(k + 1, c) && is(k + 2, c)) { found[i] = k / fps; from = k + 1; break; }
    }
  }
  return found;
}
