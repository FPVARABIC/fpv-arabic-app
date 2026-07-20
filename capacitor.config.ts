import type { CapacitorConfig } from '@capacitor/cli';

// This app deliberately does NOT ship a bundled offline copy of the web
// build inside the native shell. `server.url` points the WebView straight
// at the live Vercel deployment, so every native install always reflects
// whatever is currently deployed — no new APK build/Play Store release is
// ever needed for a web-only change. `webDir: 'dist'` is still required by
// the Capacitor CLI's config schema (and would be used as a fallback if
// `server.url` were ever removed), but as long as `server.url` is set, its
// contents are never actually loaded into the WebView.
const config: CapacitorConfig = {
  appId: 'com.fpvarabic.app',
  appName: 'FPV بالعربي',
  webDir: 'dist',
  server: {
    url: 'https://fpv-arabic-app.vercel.app',
    // https, not the default capacitor://, so the WebView's origin matches
    // the real deployed origin exactly — cookies, Firebase Auth persistence,
    // and any origin-scoped browser storage behave identically to visiting
    // the site in a normal mobile browser, with no cross-origin surprises.
    androidScheme: 'https',
    // The deployed site is already HTTPS-only in production (Vercel) — no
    // cleartext (http://) traffic is ever expected, so this is left at its
    // secure default (false) rather than explicitly widened.
  },
  plugins: {
    // Fixes black letterboxing bars top/bottom on real devices: without
    // this plugin, the cold-start splash is rendered purely by the native
    // Activity theme (styles.xml's AppTheme.NoActionBarLaunch), which sets
    // a fixed per-density splash.png directly as android:background with no
    // scale-to-fill behavior — those PNGs use the old, fixed Cordova-era
    // per-density pixel dimensions (e.g. 1280x1920 for xxxhdpi), which
    // don't match modern tall-aspect-ratio screens, hence the bars. Once
    // this plugin is present (wired via `npx cap sync android`, which
    // registers it and updates the generated capacitor.config.json this
    // native code actually reads), SplashScreen.java takes over rendering
    // with a real ImageView using the scaleType below — CENTER_CROP scales
    // uniformly and crops any overflow, so the image always fully covers
    // the screen with no bars and no distortion.
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
      backgroundColor: '#FFFFFF',
      showSpinner: false,
    },
  },
};

export default config;
