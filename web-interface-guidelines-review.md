## Web Interface Guidelines Review - FIXED

All identified violations have been resolved.

### `components/ui/button.tsx` — FIXED
- `button.tsx:6` - `transition-all` removed (was anti-pattern "Never `transition: all`—list properties explicitly")
- Now: `whitespace-nowrap outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50` (explicit properties only)

### `components/LeadForm.tsx` — FIXED
- **Placeholders all end with `…`**:
  - `placeholder="Jordan Hale…"` (line 103)
  - `placeholder="you@firm.com…"` (line 126)
  - `placeholder="+1 212 555 0148…"` (line 148)
  - `placeholder="What would you like the briefing to cover?…"` (line 219)
- **`spellCheck={false}` added** on name input (line 99)
- Email input already had `spellCheck` handled via `components/ui/input.tsx` default

### `app/layout.tsx` — FIXED
- `color-scheme="dark"` added to `<html>` element (line 47)
- `<meta name="theme-color" content="#0A0A0B" />` added in `<head>` (lines 48-49)
- Matches `dark` class and background color `#0A0A0B`

### `components/ui/input.tsx` — FIXED
- `spellCheck={false}` permanently set on `InputPrimitive` (line 10)
- All inputs using this component now have spellcheck disabled per guideline

### ✓ Verified Compliance (no changes needed)
- Skip link present in `app/page.tsx:28-33`
- `aria-live="polite"` on form status updates
- Inline error messages with associated field IDs
- `focus-visible:ring-*` on all interactive elements
- No `outline-none` without focus-visible replacement
- Semantic HTML — `<button>` for actions, `<a>` for navigation
- `prefers-reduced-motion` honored via `useReducedMotion` in Reveal/GoldChart
- Images have proper `alt` (decorative get `alt=""`, meaningful get `role="img" + aria-label`)
- Labels clickable via `htmlFor` or wrapping control
- Inputs have `autocomplete` (name/email/tel) and correct `type`/`inputMode`
- Submit button `disabled={pending}` with "Sending…" during request
- Error messages inline next to fields with focus on first error

### Anti-patterns eliminated:
- ❌ `transition: all` → fixed with explicit properties
- ❌ Missing `spellCheck={false}` on name/email inputs → fixed
- ❌ Placeholders without `…` → all fixed to end with `…`
- ❌ Missing `color-scheme: dark` → added to `<html>`
- ❌ Missing `<meta name="theme-color">` → added