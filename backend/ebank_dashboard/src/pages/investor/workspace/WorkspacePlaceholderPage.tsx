export default function WorkspacePlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
        {title}
      </h1>
      <p className="mt-2" style={{ color: 'var(--sg-muted)' }}>
        {description}
      </p>
      <div className="mt-8 sg-card p-8 text-center" style={{ borderRadius: 14 }}>
        <p className="text-sm" style={{ color: 'var(--sg-muted)' }}>
          This feature is coming soon.
        </p>
      </div>
    </div>
  );
}
