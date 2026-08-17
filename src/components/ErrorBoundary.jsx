import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="d-flex flex-column justify-content-center align-items-center vh-100 bg-light text-dark">
          <h2 className="mb-3 text-danger"><i className="bi bi-exclamation-triangle-fill me-2"></i>Something went wrong.</h2>
          <p className="text-muted mb-4 text-center" style={{ maxWidth: '600px' }}>
            We encountered an unexpected error while trying to render this page.
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
