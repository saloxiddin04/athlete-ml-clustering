const CLUSTER_COLORS = [
  { bg: 'rgba(59,130,246,0.2)', color: '#3b82f6', border: 'rgba(59,130,246,0.5)' },
  { bg: 'rgba(16,185,129,0.2)', color: '#10b981', border: 'rgba(16,185,129,0.5)' },
  { bg: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: 'rgba(245,158,11,0.5)' },
  { bg: 'rgba(239,68,68,0.2)',  color: '#ef4444', border: 'rgba(239,68,68,0.5)'  },
  { bg: 'rgba(139,92,246,0.2)', color: '#8b5cf6', border: 'rgba(139,92,246,0.5)' },
  { bg: 'rgba(6,182,212,0.2)',  color: '#06b6d4', border: 'rgba(6,182,212,0.5)'  },
];

export function ClusterBadge({ cluster, algo }) {
  if (cluster === null || cluster === undefined) return (
    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>—</span>
  );
  const c = CLUSTER_COLORS[cluster % CLUSTER_COLORS.length];
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700,
      fontFamily: 'JetBrains Mono, monospace'
    }}>
      {algo ? `${algo}:` : ''}C{cluster}
    </span>
  );
}

export const CLUSTER_COLOR_LIST = CLUSTER_COLORS;
