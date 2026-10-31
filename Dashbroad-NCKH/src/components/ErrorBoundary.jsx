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
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-sm p-6 shadow-sm text-center">
            <div className="w-12 h-12 rounded-sm bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Đã xảy ra sự cố hiển thị</h2>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
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


