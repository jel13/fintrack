# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Building for Android (using Capacitor)

This project can be bundled as a native Android application using [Capacitor](https://capacitorjs.com/).

### Prerequisites

1.  **Node.js and npm/yarn**: Ensure you have Node.js and a package manager installed.
2.  **Android Studio**: Required for building and running the Android app. Install it from [developer.android.com/studio](https://developer.android.com/studio).
3.  **Java Development Kit (JDK)**: Android Studio usually bundles this, but ensure it's correctly configured.

### Setup Steps 

1.  **Install Capacitor CLI and Core dependencies**:
    The necessary dependencies (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`) have been added to `package.json`. If you are setting up from scratch, you would run:
    ```bash
    npm install @capacitor/core @capacitor/android
    npm install -D @capacitor/cli
    ```

2.  **Initialize Capacitor**:
    This step configures Capacitor for your project. It will ask for your app name and app ID. The `web-dir` should be set to `out` (the default Next.js static export directory).
    A script is provided in `package.json`:
    ```bash
    npm run cap:init
    ```
    Alternatively, run manually:
    ```bash
    npx cap init "FinTrack Mobile" "com.fintrack.mobile" --web-dir=out
    ```
    This creates `capacitor.config.ts` (or `.json`).

3.  **Add the Android Platform**:
    This command sets up the native Android project.
    A script is provided:
    ```bash
    npm run cap:add:android
    ```
    Alternatively, run manually:
    ```bash
    npx cap add android
    ```
    This will create an `android` folder in your project root.

### Configuration for Next.js with Capacitor

-   **Static Export**: The `next.config.ts` has been updated with `output: 'export'`. This is crucial for Capacitor as it typically works best with statically generated web assets.
-   **Image Optimization**: If using `next/image`, `unoptimized: true` has been added to `images` config in `next.config.ts` because the default Next.js image optimization server won't be available in a static export. You might need to handle image optimization differently or ensure images are pre-optimized.
-   **Base Path**: If your app uses a base path, ensure it's correctly configured in `next.config.ts` and that Capacitor loads assets from the correct paths. For a simple app without a base path, default settings should work.
-   **Capacitor Configuration (`capacitor.config.ts`)**:
    The `capacitor.config.ts` file is pre-configured to facilitate local development with live reload:
    ```typescript
    import type { CapacitorConfig } from '@capacitor/cli';

    const config: CapacitorConfig = {
      appId: 'com.fintrack.mobile',
      appName: 'FinTrack Mobile',
      webDir: 'out',
      server: {
        // For local development with live reload.
        // Replace 'localhost' with your machine's local IP address if running on a physical device
        // or an emulator that cannot access localhost (e.g., use 10.0.2.2 for Android Studio's default emulator to access host's localhost).
        // The port 9002 matches the `npm run dev` script.
        url: 'http://localhost:9002', 
        androidScheme: 'http', // Use 'https' if your dev server uses SSL
        cleartext: true // Required if using http for local dev server
      },
      // ... other plugins
    };

    export default config;
    ```
    **Note on `server.url`**: 
    * For Android Studio's default emulator, `http://10.0.2.2:9002` can be used to access your host machine's `localhost:9002`.
    * For physical devices or other emulators, replace `localhost` with your computer's actual IP address on the local network (e.g., `http://192.168.1.100:9002`).
    * For production builds, you typically comment out or remove the `server.url` configuration. Capacitor will bundle the `out` directory.

### Development Workflow (Running on Android with Live Reload)

1.  **Run your Next.js dev server**:
    ```bash
    npm run dev
    ```
    This starts the server, usually on `http://localhost:9002`.

2.  **Ensure `capacitor.config.ts` `server.url` is correctly set**:
    As described above, it should point to your Next.js dev server's IP address and port (e.g., `http://10.0.2.2:9002` for default Android emulators or `http://YOUR_MACHINE_IP:9002` for physical devices). Your mobile device/emulator needs to be able to reach this IP.

3.  **Sync your web assets with the native project**:
    This step is important even for live reload, as it updates native configurations and plugins.
    ```bash
    npm run cap:sync
    ```
    Or:
    ```bash
    npx cap sync
    ```

4.  **Open the Android project in Android Studio**:
    ```bash
    npm run cap:open:android
    ```
    Or:
    ```bash
    npx cap open android
    ```

5.  **Run the app on an emulator or physical device** from Android Studio by clicking the "Run" button. The app should connect to your Next.js dev server and reflect changes as you save them in your web code.

### Production Build (Bundling Web Assets into APK)

1.  **Build your Next.js app for static export**:
    ```bash
    npm run build 
    ```
    (The build script should already include static export if `output: 'export'` is in `next.config.ts`.)

2.  **Important**: For a production build, ensure the `server.url` in `capacitor.config.ts` is commented out or removed so Capacitor bundles the static assets from the `out` directory.
    Example for production in `capacitor.config.ts`:
    ```typescript
    server: {
        // url: 'http://localhost:9002', // Commented out for production
        // androidScheme: 'http',
        cleartext: true, 
      },
    ```

3.  **Sync the `out` directory with Capacitor**:
    ```bash
    npm run cap:sync
    ```
4.  **Build the Android App**:
    You can do this via Android Studio:
    - Open the `android` folder in Android Studio (`npx cap open android`).
    - Go to `Build > Generate Signed Bundle / APK...`. Follow the Android Studio instructions to create a signed APK or App Bundle.

    A script is also provided for a debug build (you'll need to configure signing separately for release):
    ```bash
    npm run cap:build:android 
    ```
    This typically runs `npx cap build android` or similar, which might attempt to build a debug APK using the bundled assets.

### Important Considerations

-   **Native APIs**: To access native device features (camera, GPS, etc.), you'll use Capacitor plugins.
-   **Routing**: Ensure Next.js routing works correctly within the WebView.
-   **Performance**: Optimize your web app for mobile performance.
-   **Splash Screens & Icons**: Configure these in the native Android project (`android/app/src/main/res`).
-   **Permissions**: Request Android permissions for native features via Capacitor plugins or in `AndroidManifest.xml`.
