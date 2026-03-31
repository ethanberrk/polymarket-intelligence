export default function Page() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      gap: '1rem',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <h1 style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '2.5rem', fontWeight: 700 }}>
        By The Odds
      </h1>
      <p style={{ color: 'var(--color-text-muted, #888)', fontSize: '1.1rem' }}>
        Under construction — check back soon.
      </p>
    </div>
  )
}
