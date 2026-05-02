export default function Card({ children, style = {}, className = '' }) {
  return (
    <div className={className} style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 24, ...style
    }}>
      {children}
    </div>
  );
}
