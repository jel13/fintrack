import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fintrack.mobile',
  appName: 'FinTrack Mobile',
  webDir: 'out', // Next.js static export directory
  server: {
    // For local development with live reload.
    // Replace 'localhost' with your machine's local IP address if running on a physical device
    // or an emulator that cannot access localhost (e.g., use 10.0.2.2 for Android Studio's default emulator to access host's localhost).
    // The port 9002 matches the `npm run dev` script.
    url: 'http://localhost:9002',
    androidScheme: 'http', // Use 'https' if your dev server uses SSL
    cleartext: true, // Required if using http for local dev server
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#66CC99", // Mint green to match theme
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
