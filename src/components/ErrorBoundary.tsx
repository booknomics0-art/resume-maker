import React from 'react';

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--silver-100)', padding: 24,
        }}>
          <div className="card" style={{ maxWidth: 460, padding: 28, textAlign: 'center' }}>
            <h2 style={{ color: 'var(--navy-900)' }}>Kuch gadbad ho gayi</h2>
            <p className="hint" style={{ margin: '10px 0 18px' }}>
              Page load hote waqt ek error aaya. Reload karke dobara try karo —
              aapka resume data safe hai (browser me saved).
            </p>
            <button className="btn primary" onClick={() => location.reload()}>Reload page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
