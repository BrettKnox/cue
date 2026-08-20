// Injects the LLM backend at build time. Keeps keys out of app.json (which is committed).
//
// ponytail: whatever lands in `extra` is readable inside the shipped bundle. That is
// acceptable for dogfooding and internal-track builds only — before a public release the
// key moves behind a proxy and CUE_LLM_BASE_URL points at that proxy instead.
const base = require('./app.json');

module.exports = () => ({
  ...base.expo,
  extra: {
    ...(base.expo.extra ?? {}),
    llmBaseUrl: process.env.CUE_LLM_BASE_URL ?? 'https://api.deepseek.com/v1',
    llmModel: process.env.CUE_LLM_MODEL ?? 'deepseek-v4-flash',
    llmApiKey: process.env.CUE_LLM_API_KEY ?? '',
  },
});
