import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ============================================================================
 * COMPONENT: ErrorBoundary
 * ============================================================================
 * Bắt các lỗi runtime trong cây React Component và hiển thị màn hình fallback
 * thân thiện cho người dùng, hỗ trợ nút bấm thử lại (Retry).
 * ============================================================================
 */
export class ErrorBoundary extends React.Component {
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

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-error-surface min-h-screen flex items-center justify-center p-6">
          <div className="publication-panel app-error-panel max-w-md w-full p-6 text-center">
            <div className="w-12 h-12 rounded-md bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-semibold text-slate-800 mb-2">Đã xảy ra sự cố hiển thị</h2>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed break-words">
              {this.state.error?.message || 'Có lỗi không xác định xảy ra khi kết xuất giao diện Dashboard.'}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tải lại trang</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


