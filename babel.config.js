// babel-preset-expo resolves the "@/*" alias straight from tsconfig paths (SDK 50+),
// so there is no module-resolver plugin here and no dependency to keep in sync.
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
