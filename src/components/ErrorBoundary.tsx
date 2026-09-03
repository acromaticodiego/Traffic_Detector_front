import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Without this, any throw during render unmounts the whole tree and leaves the
 * page black with nothing but a console trace — which is exactly what a stale
 * backend sending an older message shape used to do.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Fallo de render:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="crash">
        <h1>La interfaz falló al renderizar</h1>
        <p className="crash-msg">{error.message}</p>
        <p className="crash-hint">
          Causa habitual: el servicio de visión corriendo es una versión
          anterior a la del frontend. Reinícialo y recarga esta página.
        </p>
        <button onClick={() => window.location.reload()}>Recargar</button>
      </div>
    );
  }
}
