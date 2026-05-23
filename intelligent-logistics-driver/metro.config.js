const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const sharedPkg = path.resolve(__dirname, '../packages/shared/src');

const config = getDefaultConfig(__dirname);

// Watch the shared package so Metro picks up changes
config.watchFolders = [sharedPkg];

// Resolve @il/shared to the shared package source
config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    '@il/shared': sharedPkg,
};

module.exports = config;
