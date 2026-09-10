import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stacky.gaterunner',
  appName: 'Stacky Fleet',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
