import type { CapacitorConfig } from '@capacitor/cli';

const productionUrl = 'https://emeraldcash-systems.vercel.app';
const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  `${productionUrl}/login`;

const config: CapacitorConfig = {
  appId: 'com.emeraldcash.vms',
  appName: 'Emerald Cash Systems',
  webDir: '.next/server/app',
  android: {
    webContentsDebuggingEnabled: true,
  },
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith('http://'),
          allowNavigation: ['emeraldcash-systems.vercel.app'],
        },
      }
    : {}),
};

export default config;
