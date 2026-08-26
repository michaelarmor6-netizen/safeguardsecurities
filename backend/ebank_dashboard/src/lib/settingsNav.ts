// Settings sections, shared by the sidebar flyout and the in-page tab strip.
//
// One definition so the two can never drift: the hover menu in the workspace
// sidebar and the horizontal tabs on the Settings page render the same list.

export interface SettingsNavItem {
  slug: string;
  /** Full label, used in the sidebar flyout where there is room. */
  label: string;
  /** Shorter label for the horizontal tab strip. Falls back to `label`. */
  short?: string;
}

export interface SettingsNavGroup {
  label: string;
  items: SettingsNavItem[];
}

export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    label: 'Your details',
    items: [
      { slug: 'personal-details', label: 'Personal details', short: 'Personal' },
      { slug: 'investment-profile', label: 'Employment & investment', short: 'Employment' },
      { slug: 'account-manager', label: 'Account manager', short: 'Manager' },
      { slug: 'refer-a-friend', label: 'Refer a friend', short: 'Referrals' },
    ],
  },
  {
    label: 'Security',
    items: [
      { slug: 'credentials', label: 'Email and password', short: 'Email & password' },
      { slug: 'two-factor', label: 'Two-factor authentication', short: 'Two-factor' },
      { slug: 'login-activity', label: 'Login activity', short: 'Login activity' },
      { slug: 'close-account', label: 'Close account', short: 'Close account' },
    ],
  },
  {
    label: 'Verification',
    items: [{ slug: 'identity', label: 'Identity verification', short: 'Verification' }],
  },
];

export const DEFAULT_SETTINGS_SECTION = 'personal-details';

/** Flat list, in sidebar order — what the horizontal tab strip renders. */
export const SETTINGS_ITEMS: SettingsNavItem[] = SETTINGS_NAV.flatMap((g) => g.items);

export function findSettingsItem(slug?: string): SettingsNavItem | undefined {
  return SETTINGS_ITEMS.find((i) => i.slug === (slug ?? DEFAULT_SETTINGS_SECTION));
}
