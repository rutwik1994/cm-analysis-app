export function ComingSoon({ title, subtitle, breadcrumb }: {
  title: string;
  subtitle: string;
  breadcrumb: string;
}) {
  return (
    <div style={{ background: '#F8F8F8', minHeight: '100vh' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #EEE', padding: '22px 32px' }}>
        <div style={{ fontSize: 12, color: '#676767', marginBottom: 6, display: 'flex', gap: 6 }}>
          <span>Strategic Procurement</span>
          <span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: '#242424' }}>{breadcrumb}</span>
        </div>
        <h1 style={{ font: '500 30px/38px var(--font-display)', color: '#242424', margin: 0 }}>{title}</h1>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 100px)' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 16, background: '#F6FDE9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: 32,
          }}>🚧</div>
          <h2 style={{ font: '600 20px/28px var(--font-body)', color: '#242424', margin: '0 0 10px' }}>
            Coming Soon
          </h2>
          <p style={{ font: '400 14px/22px var(--font-body)', color: '#676767', margin: 0 }}>
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
