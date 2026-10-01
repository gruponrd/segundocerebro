import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Keep the original package ID to preserve existing native installations.
  appId: 'app.lovable.e293a9d69a51447fadb42258bf1b30eb',
  appName: 'Segundo Cérebro',
  webDir: 'dist',
  server: {
    url: 'https://segundo-cerebro-nrd10.vercel.app',
    cleartext: false,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#8B5CF6',
      sound: 'beep.wav',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
