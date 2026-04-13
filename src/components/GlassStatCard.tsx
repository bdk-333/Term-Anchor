type StatVariant = 'lime' | 'cyan' | 'white' | 'red'

export function GlassStatCard({
  label,
  value,
  variant,
}: {
  label: string
  value: string | number
  variant: StatVariant
}) {
  return (
    <div className={`ta-glass-stat ta-glass-stat--${variant}`}>
      <p className="ta-glass-stat-label">{label}</p>
      <p className="ta-glass-stat-value">{value}</p>
    </div>
  )
}
