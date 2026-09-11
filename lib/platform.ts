export function isNetlifyRuntime() {
  return process.env.NETLIFY === "true" || process.env.NITRO_PRESET === "netlify";
}
