import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stacky.gaterunner',
  appName: 'Space Gate Runner',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
