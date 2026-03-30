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
    <div className={`gs-glass-stat gs-glass-stat--${variant}`}>
      <p className="gs-glass-stat-label">{label}</p>
      <p className="gs-glass-stat-value">{value}</p>
    </div>
  )
}
