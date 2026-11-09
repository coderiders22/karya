/**
 * The public address of this Ruvano install, without a trailing slash. Used in invite and
 * reset links and the GitHub webhook URL.
 * APP_URL wins; on Vercel it falls back to the project's production domain.
 */
export function appUrl() {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return (process.env.APP_URL || (vercel ? `https://${vercel}` : "http://localhost:3000")).replace(/\/$/, "");
}
