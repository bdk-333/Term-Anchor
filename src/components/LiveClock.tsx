import { useEffect, useState } from 'react'

export function LiveClock() {
  const [t, setT] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setT(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <p
      className="font-mono text-sm sm:text-base text-gs-accent tabular-nums tracking-tight"
      title="Local time"
    >
      {t.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}
    </p>
  )
}
