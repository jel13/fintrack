import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fintrack.mobile',
  appName: 'FinTrack Mobile',
  webDir: 'out', // Next.js static export directory
  server: {
    // For local development with live reload, uncomment and set your local dev server URL.
    // Ensure your mobile device/emulator can access this IP address.
    // url: 'http://192.168.X.X:9002', // Replace X.X with your local IP
    // androidScheme: 'http', // Use 'https' if your dev server uses SSL
    cleartext: true, // Required if using http for local dev server
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffff", // Match your app's background
      // androidSplashResourceName: "splash", // Default is "splash"
      // showSpinner: true,
      // androidSpinnerStyle: "large",
      // iosSpinnerStyle: "small",
      // spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
