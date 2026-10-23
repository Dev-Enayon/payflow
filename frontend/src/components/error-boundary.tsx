import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Unhandled render error', error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col bg-canvas">
          <header className="border-b border-border bg-white">
            <div className="mx-auto flex h-16 w-full max-w-5xl items-center px-4 sm:px-6">
              <Logo />
            </div>
          </header>
          <main className="flex flex-1 items-center justify-center px-4 py-16">
            <div className="max-w-md text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 text-amber-600">
                <AlertTriangle className="size-6" />
              </span>
              <h1 className="mt-5 text-[26px] font-bold tracking-[-0.03em] text-navy-900">
                Something went wrong
              </h1>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                The page could not be rendered. Reload to try again. If the problem persists, contact
                support.
              </p>
              <Button className="mt-6" onClick={() => window.location.reload()}>
                Reload page
              </Button>
            </div>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}
