/**
 * Optional AI, through GLM on z.ai (an OpenAI-style chat API). Server-side only: the key never
 * reaches the browser.
 *
 *   ZHIPUAI_API_KEY   the z.ai API key (GLM_API_KEY and ZAI_API_KEY also work)
 *   GLM_MODEL         the model, "glm-4.5-flash" if unset (the one this key's free plan runs)
 *
 * With no key, every AI feature hides itself and the rest of Ruvano works as before. AI only ever
 * suggests or summarises; it never changes cards on its own.
 */
const URL = process.env.GLM_API_URL ?? "https://api.z.ai/api/paas/v4/chat/completions";
const key = () => (process.env.ZHIPUAI_API_KEY || process.env.GLM_API_KEY || process.env.ZAI_API_KEY || "").trim();

export const aiConfigured = () => !!key();

/** AI is available for a workspace when the server has a key and the workspace hasn't switched it off. */
export const aiAvailable = (workspace: { aiEnabled: boolean } | null | undefined) => aiConfigured() && !!workspace?.aiEnabled;

// A little protection against one person running up the bill. Per server instance, so it's a
// ceiling, not an exact count.
const recent = new Map<string, number[]>();
export function aiRateLimited(who: string, perHour = 30) {
  const now = Date.now();
  const calls = (recent.get(who) ?? []).filter((t) => now - t < 3600_000);
  if (calls.length >= perHour) return true;
  recent.set(who, [...calls, now]);
  return false;
}

/** One chat completion. Returns the text, or null if AI is off, slow or unavailable. Never throws. */
export async function aiChat({ system, user, maxTokens = 400, temperature = 0.2 }: { system: string; user: string; maxTokens?: number; temperature?: number }): Promise<string | null> {
  if (!aiConfigured()) return null;
  const model = process.env.GLM_MODEL || "glm-4.5-flash";
  // One retry when the provider says it's busy. A slow answer isn't retried, so nobody waits twice.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 2500));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25_000);
    try {
      const res = await fetch(URL, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key()}` },
        body: JSON.stringify({
          model, temperature, max_tokens: maxTokens,
          thinking: { type: "disabled" },
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
        }),
        cache: "no-store",
      });
      if (!res.ok) {
        console.warn(`AI: ${model} answered ${res.status}`);
        if (res.status === 429 || res.status >= 500) continue;
        return null;
      }
      const data = await res.json();
      const text = String(data?.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      if (text) return text;
    } catch (e) {
      console.warn(`AI: ${model} failed`, e instanceof Error ? e.message : e);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}
