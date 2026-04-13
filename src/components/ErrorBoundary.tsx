import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }

type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="min-h-dvh flex items-center justify-center p-6 bg-ta-bg text-ta-text">
          <div className="max-w-md space-y-4 ta-glass-panel ta-glass-panel--tilt-none p-6 rounded-xl">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="text-sm text-ta-muted leading-relaxed">
              The UI hit an unexpected error. Your data is still on disk or in the browser; try
              reloading the page. If this keeps happening, export a backup from Settings before
              digging further.
            </p>
            <pre className="text-xs font-mono text-ta-danger/90 whitespace-pre-wrap break-words max-h-40 overflow-auto bg-ta-bg/80 p-3 rounded border border-ta-border">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              className="w-full py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider bg-ta-accent text-ta-bg"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
