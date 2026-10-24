import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    // eslint-disable-next-line no-console
    console.error("[Motion Easy] ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error?.message ?? String(this.state.error);
      return (
        <div className="min-h-screen bg-deep px-6 py-16">
          <div className="mx-auto max-w-xl rounded-2xl border border-error/30 bg-panel p-6 text-center shadow-lg">
            <p className="text-sm font-bold text-error">Ups — halaman ini sempat error</p>
            <p className="mt-2 font-mono text-xs leading-relaxed text-ink-dim break-all">
              {msg}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-bg hover:bg-accent"
              >
                Muat Ulang
              </button>
              <button
                onClick={() => this.setState({ error: null })}
                className="rounded-xl border border-edge bg-panel-low px-4 py-2 text-xs font-mono text-ink hover:bg-panel-high"
              >
                Coba lagi
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
