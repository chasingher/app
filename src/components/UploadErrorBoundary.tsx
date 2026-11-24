import React from 'react';
import { AlertTriangle, RotateCcw, XCircle, ArrowLeft } from 'lucide-react';
import { getRecentUploadLogs } from '../utils/uploadPipeline';

interface UploadErrorBoundaryProps {
  children: React.ReactNode;
  projectSlug?: string;
  mode?: 'customer' | 'admin';
  onCancelActiveUpload?: () => void;
  onBackToAccount?: () => void;
}

interface UploadErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  resetCounter: number;
}

/**
 * React Error Boundary wrapping the Site Builder Studio so unexpected runtime,
 * upload, or Firestore sync exceptions never white-screen the customer or admin
 * builder and always provide explicit Cancel & Retry recovery actions.
 */
export class UploadErrorBoundary extends React.Component<
  UploadErrorBoundaryProps,
  UploadErrorBoundaryState
> {
  constructor(props: UploadErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      resetCounter: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<UploadErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage:
        error instanceof Error && error.message
          ? error.message
          : 'An unexpected interruption occurred during the Site Builder upload process.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const recentLogs = getRecentUploadLogs().slice(-5);
    console.error('[SiteBuilderUpload][ErrorBoundary] Caught builder exception', {
      projectSlug: this.props.projectSlug || 'unknown',
      mode: this.props.mode || 'customer',
      errorName: error.name,
      errorMessage: error.message,
      componentStack: info.componentStack,
      recentUploadTrace: recentLogs,
    });
  }

  handleCancelAndReset = (): void => {
    try {
      this.props.onCancelActiveUpload?.();
    } catch {
      // ignore cancellation callback errors
    }
    console.warn('[SiteBuilderUpload][ErrorBoundary] User cancelled stuck upload and reset builder', {
      projectSlug: this.props.projectSlug || 'unknown',
    });
    this.setState((prev) => ({
      hasError: false,
      errorMessage: '',
      resetCounter: prev.resetCounter + 1,
    }));
  };

  handleRetry = (): void => {
    console.info('[SiteBuilderUpload][ErrorBoundary] User triggered builder retry', {
      projectSlug: this.props.projectSlug || 'unknown',
    });
    this.setState((prev) => ({
      hasError: false,
      errorMessage: '',
      resetCounter: prev.resetCounter + 1,
    }));
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <section
          role="alert"
          data-testid="upload-error-boundary-fallback"
          className="max-w-2xl mx-auto my-8 rounded-3xl bg-[#1A060C] border border-[#E2B96F]/35 p-6 sm:p-8 text-[#FBF3EA] shadow-lg space-y-5"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#3A0D18] border border-[#E2B96F]/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6 text-[#E2B96F]" />
            </div>
            <div className="space-y-1.5 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#E2B96F]">
                Upload Recovery Boundary
              </p>
              <h2 className="font-serif text-xl sm:text-2xl text-[#FFF9F2]">
                Your builder hit an unexpected interruption
              </h2>
              <p className="text-sm text-[#FBF3EA]/75 leading-relaxed">
                You can cancel any in-progress transfer and safely retry your site builder without losing your saved project.
              </p>
              {this.state.errorMessage && (
                <p className="mt-2 rounded-xl bg-[#120408] border border-rose-400/25 px-3.5 py-2.5 text-xs text-rose-200 break-words">
                  {this.state.errorMessage}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              data-testid="error-boundary-cancel-btn"
              onClick={this.handleCancelAndReset}
              className="min-h-[44px] px-5 py-2.5 rounded-xl border border-rose-400/40 bg-rose-950/50 hover:bg-rose-900/60 text-rose-100 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <XCircle className="h-4 w-4" />
              <span>Cancel Stuck Upload &amp; Reset</span>
            </button>

            <button
              type="button"
              data-testid="error-boundary-retry-btn"
              onClick={this.handleRetry}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#E2B96F] hover:bg-[#edd18f] text-[#16050A] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retry Builder</span>
            </button>

            {this.props.onBackToAccount && (
              <button
                type="button"
                onClick={this.props.onBackToAccount}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#E2B96F]/25 bg-[#120408] hover:border-[#E2B96F] text-[#FBF3EA]/85 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to My Site</span>
              </button>
            )}
          </div>
        </section>
      );
    }

    return <React.Fragment key={this.state.resetCounter}>{this.props.children}</React.Fragment>;
  }
}
