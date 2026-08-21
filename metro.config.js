// expo-sqlite ships its web build as WebAssembly, which metro does not treat as an asset
// by default. Web is a TEST lane only (it makes layout and contrast measurable without a
// device) — the app ships to phones.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm');
module.exports = config;
