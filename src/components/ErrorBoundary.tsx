import React, { ErrorInfo, ReactNode } from 'react';

export class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if ((this as any).state.hasError) {
      let errorMessage = '申し訳ありません。エラーが発生しました。';
      
      try {
        // Check if it's a Firestore JSON error
        const parsed = JSON.parse((this as any).state.error?.message || '');
        if (parsed.error && parsed.operationType) {
          errorMessage = `データベースエラー (${parsed.operationType}): ${parsed.error}`;
        }
      } catch (e) {
        // Not a JSON error
        errorMessage = (this as any).state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#f5f5dc] flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-2xl font-black text-red-600 mb-4">エラーが発生しました</h1>
          <div className="bg-white p-6 rounded-lg shadow-md border border-red-100 max-w-md w-full">
            <p className="text-gray-700 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-red-600 text-white rounded-md font-bold shadow-md active:scale-95 transition-transform"
            >
              アプリを再読み込みする
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
