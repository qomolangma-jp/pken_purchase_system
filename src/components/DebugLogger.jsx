import React, { useState, useEffect } from 'react';

const DebugLogger = () => {
  const [logs, setLogs] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // デバッグモードの判定
  const forceDebug = import.meta.env.VITE_FORCE_DEBUG === 'true';
  const isDev = import.meta.env.DEV;
  const shouldShow = isDev || forceDebug;

  useEffect(() => {
    setIsMounted(true);
    console.log('=== DebugLogger 起動 ===');
    console.log('環境:', import.meta.env.MODE);
    console.log('VITE_FORCE_DEBUG:', import.meta.env.VITE_FORCE_DEBUG);
    console.log('表示:', shouldShow ? '有効' : '無効');
  }, [shouldShow]);

  useEffect(() => {
    if (!shouldShow) return;

    // console.log, console.error, console.warn をオーバーライド
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const addLog = (type, args) => {
      const timestamp = new Date().toLocaleTimeString('ja-JP');
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setLogs(prev => [...prev.slice(-49), { type, message, timestamp }]);
    };

    console.log = (...args) => {
      originalLog(...args);
      addLog('log', args);
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args);
    };

    // エラーイベントをキャッチ
    const handleError = (event) => {
      addLog('error', [`${event.message} at ${event.filename}:${event.lineno}`]);
    };

    window.addEventListener('error', handleError);

    // クリーンアップ
    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener('error', handleError);
    };
  }, [shouldShow]);

  // 表示条件
  if (!shouldShow || !isMounted) return null;

  const getLogColor = (type) => {
    switch (type) {
      case 'error': return 'text-white bg-red-900';
      case 'warn': return 'text-yellow-700 bg-yellow-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  // デバッグログが非表示の場合は、左下にボタンだけ表示
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg flex items-center gap-2"
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '16px',
          padding: '12px 16px',
          zIndex: 9999,
          fontSize: '14px'
        }}
        title="デバッグログを表示"
      >
        🐛 Debug
        {logs.length > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
            {logs.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div 
      className="bg-black bg-opacity-95 text-white rounded-t-lg shadow-2xl flex flex-col border-t-4 border-green-500"
      style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0,
        width: '100%', 
        maxHeight: isMinimized ? 'auto' : '30vh', 
        minHeight: isMinimized ? 'auto' : '120px', 
        margin: 0, 
        padding: 0,
        zIndex: 9999
      }}
    >
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-2 border-b border-gray-700 bg-green-600 rounded-t-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">🐛 Debug Log (LIFF)</span>
              <span className="text-xs text-gray-200">({logs.length})</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-green-700 px-2 py-1 rounded text-xs font-bold"
              >
                {isMinimized ? '□' : '−'}
              </button>
              <button
                onClick={() => setLogs([])}
                className="text-white hover:bg-green-700 px-2 py-1 rounded text-xs font-bold"
              >
                🗑️
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="text-white hover:bg-green-700 px-2 py-1 rounded text-xs font-bold"
              >
                ✕
              </button>
            </div>
          </div>

          {/* ログ表示 */}
          {!isMinimized && (
            <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs font-mono" style={{ background: 'rgba(0,0,0,0.92)' }}>
              {logs.length === 0 ? (
                <div className="text-gray-400 text-center py-4">
                  ログがありません
                  <br />
                  <span className="text-xs">console.log等でログを出力してください</span>
                </div>
              ) : (
                logs.map((log, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded border`}
                    style={{
                      backgroundColor: log.type === 'error' ? '#7f1d1d' : log.type === 'warn' ? '#fef3c7' : '#f9fafb',
                      color: log.type === 'error' ? '#ffffff' : log.type === 'warn' ? '#a16207' : '#374151',
                      borderColor: log.type === 'error' ? '#991b1b' : '#9ca3af'
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span 
                        className="whitespace-nowrap"
                        style={{ color: log.type === 'error' ? '#d1d5db' : '#9ca3af' }}
                      >
                        {log.timestamp}
                      </span>
                      <span 
                        className="font-bold"
                        style={{ color: log.type === 'error' ? '#ffffff' : log.type === 'warn' ? '#ca8a04' : '#2563eb' }}
                      >
                        [{log.type.toUpperCase()}]
                      </span>
                    </div>
                    <pre 
                      className="mt-1 whitespace-pre-wrap break-all"
                      style={{ color: log.type === 'error' ? '#ffffff' : '#1f2937' }}
                    >
                      {log.message}
                    </pre>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
  );
};

export default DebugLogger;
