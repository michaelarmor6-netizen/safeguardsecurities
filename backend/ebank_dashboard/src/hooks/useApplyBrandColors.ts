import { useEffect } from 'react';
import { getPlatformSettings } from '../services/investor/settingsService';

// Applies admin-configured brand colors as CSS custom property overrides on
// :root, on top of whatever safeguardTheme.css already set for the active
// light/dark theme. Firestore-schemaless -> the colors here are exactly the
// two swatches editable in Settings -> Appearance & Branding, so a saved
// change there takes visible effect on next load without a rebuild.
export function useApplyBrandColors() {
  useEffect(() => {
    let cancelled = false;
    getPlatformSettings()
      .then((s) => {
        if (cancelled) return;
        if (s.brandPrimaryColor) document.documentElement.style.setProperty('--sg-indigo', s.brandPrimaryColor);
        if (s.brandAccentColor) document.documentElement.style.setProperty('--sg-teal', s.brandAccentColor);
      })
      .catch(() => {
        // Non-critical - the CSS file's defaults already apply.
      });
    return () => {
      cancelled = true;
    };
  }, []);
}
