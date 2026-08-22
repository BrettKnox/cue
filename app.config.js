// Injects the proxy endpoint at build time. Keeps secrets out of app.json (committed).
//
// Whatever lands in `extra` is readable inside the shipped bundle, so ONLY the proxy URL
// and its rotatable token go here. The OpenRouter key lives as a Cloudflare Worker secret
// (see proxy/worker.js) and must never appear in this file or the environment it reads.
const base = require('./app.json');

module.exports = () => ({
  ...base.expo,
  extra: {
    ...(base.expo.extra ?? {}),
    proxyUrl: process.env.CUE_PROXY_URL ?? '',
    proxyToken: process.env.CUE_PROXY_TOKEN ?? '',
  },
});
