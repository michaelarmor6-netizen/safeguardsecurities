import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Monitor, Smartphone, X } from 'lucide-react';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(
    () => window.__sgInstallPrompt ?? null,
  );
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    if (installed) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('getapp')) setOpen(true);
  }, [installed]);

  useEffect(() => {
    const sync = () => setPromptEvent(window.__sgInstallPrompt ?? null);
    const onInstalled = () => {
      setInstalled(true);
      setOpen(false);
    };
    window.addEventListener('sg-install-ready', sync);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('sg-install-ready', sync);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const installNow = async () => {
    const event = promptEvent ?? window.__sgInstallPrompt;
    if (!event) {
      setOpen(false);
      return;
    }
    await event.prompt();
    const choice = await event.userChoice;
    window.__sgInstallPrompt = undefined;
    setPromptEvent(null);
    if (choice.outcome === 'accepted') setInstalled(true);
    setOpen(false);
  };

  if (installed) return null;

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold"
        style={{
          borderColor: 'var(--sg-indigo)',
          color: '#fff',
          background: 'var(--sg-indigo-deep, #6366f1)',
          fontFamily: 'var(--sg-font-display)',
        }}
        onClick={() => setOpen(true)}
      >
        <Download className="h-4 w-4" />
        Get the app
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: 'rgba(15, 23, 42, 0.55)' }}
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="sg-get-app-title"
              className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Close"
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-500"
                style={{ background: '#f1f5f9' }}
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
              <img src="/logo-150x150.png" alt="" className="h-10 w-10 rounded-lg" />
              <h2 id="sg-get-app-title" className="mt-4 text-2xl font-bold text-slate-900">
                Get SafeGuard as an app
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                It opens full-screen like any other app — no app store needed. Here&apos;s how:
              </p>
              <div className="mt-4 space-y-3">
                <div className="flex gap-3 rounded-2xl p-4" style={{ background: '#eef6ff' }}>
                  <Monitor className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#2563eb' }} />
                  <p className="text-sm leading-relaxed text-slate-700">
                    Click the install icon at the right end of the address bar — or open the browser menu and choose{' '}
                    <strong>Install SafeGuard</strong>.
                  </p>
                </div>
                <div className="flex gap-3 rounded-2xl p-4" style={{ background: '#fdf2f8' }}>
                  <Smartphone className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#db2777' }} />
                  <p className="text-sm leading-relaxed text-slate-700">
                    On a phone instead? Open this same address there and tap <strong>Get the app</strong>.
                  </p>
                </div>
              </div>
              <p className="mt-4 rounded-xl py-3 text-center text-sm font-semibold text-slate-800" style={{ background: '#f8fafc' }}>
                app.safeguardsecurities.us
              </p>
              <button
                type="button"
                className="mt-4 w-full rounded-full py-3 text-sm font-semibold text-white"
                style={{ background: '#0f172a' }}
                onClick={promptEvent ? installNow : () => setOpen(false)}
              >
                {promptEvent ? 'Install now' : 'Got it'}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
