/**
 * Copy HTML so Thunderbird (HTML compose) can paste a formatted invoice.
 * Windows/Thunderbird prefers the system HTML clipboard from a contenteditable
 * copy; ClipboardItem is used where the browser allows text/html. Last resort
 * is the raw HTML source for Insert → HTML in Thunderbird.
 */
export type HtmlCopyMode = 'rich' | 'source';

function copyViaContentEditable(html: string): boolean {
  const host = document.createElement('div');
  host.setAttribute('contenteditable', 'true');
  host.style.position = 'fixed';
  host.style.left = '-9999px';
  host.style.top = '0';
  host.innerHTML = html;
  document.body.appendChild(host);
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(host);
  selection?.removeAllRanges();
  selection?.addRange(range);
  host.focus();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  selection?.removeAllRanges();
  document.body.removeChild(host);
  return ok;
}

export async function copyHtmlForEmail(html: string, plain?: string): Promise<HtmlCopyMode> {
  const plainText = plain ?? html;
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' }),
      }),
    ]);
    return 'rich';
  } catch {
    if (copyViaContentEditable(html)) return 'rich';
    await navigator.clipboard.writeText(html);
    return 'source';
  }
}

export async function copyHtmlSource(html: string): Promise<void> {
  await navigator.clipboard.writeText(html);
}
