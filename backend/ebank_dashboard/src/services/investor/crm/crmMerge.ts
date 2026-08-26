// Merge-field rendering, shared by the in-app preview and (as a hand-copied
// twin in functions-crm/src/index.ts) the send worker. CHANGE BOTH - the
// same invariant this repo already maintains for optionValuation and
// fundingReference. The functions copy is the one that touches real inboxes.

export type MergeContext = Record<string, string>;

// {{field}} -> value; unknown fields collapse to '' rather than leaking
// braces into a client-facing email.
export function renderMerge(template: string, ctx: MergeContext): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => ctx[key] ?? '');
}

// Plain-text alternative derived from the HTML - crude on purpose; it exists
// for spam-filter goodwill and screen readers, not for beauty.
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|tr|h1|h2|h3|li|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&sect;/g, 'S')
    .replace(/&middot;|&#183;|·/g, '-').replace(/&mdash;|—/g, '-')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
