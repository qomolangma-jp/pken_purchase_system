import React, { useState, useEffect } from 'react';

const DebugLogger = () => {
  const [logs, setLogs] = useState([]);
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // 開発環境でない場合は何もしない
    if (import.meta.env.PROD) return;

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
  }, []);

  // 開発環境でない場合は何も表示しない
  if (import.meta.env.PROD) return null;
  if (!isVisible) return null;

  const getLogColor = (type) => {
    switch (type) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warn': return 'text-yellow-700 bg-yellow-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  return (
    <div className={`fixed ${isMinimized ? 'bottom-4 right-4' : 'inset-4'} z-[9999] pointer-events-none`}>
      <div className={`${isMinimized ? 'w-auto' : 'w-full h-full'} pointer-events-auto`}>
        <div className="bg-black bg-opacity-90 text-white rounded-lg shadow-2xl flex flex-col" 
             style={{ height: isMinimized ? 'auto' : '100%' }}>
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-3 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">🐛 Debug Log</span>
              <span className="text-xs text-gray-400">({logs.length})</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-gray-700 px-2 py-1 rounded text-xs"
              >
                {isMinimized ? '□' : '−'}
              </button>
              <button
                onClick={() => setLogs([])}
                className="text-white hover:bg-gray-700 px-2 py-1 rounded text-xs"
              >
                🗑️
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="text-white hover:bg-gray-700 px-2 py-1 rounded text-xs"
              >
                ✕
              </button>
            </div>
          </div>

          {/* ログ表示 */}
          {!isMinimized && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs font-mono">
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center py-4">ログがありません</div>
              ) : (
                logs.map((log, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded ${getLogColor(log.type)} border border-gray-600`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-gray-400 whitespace-nowrap">{log.timestamp}</span>
                      <span className={`font-bold ${
                        log.type === 'error' ? 'text-red-600' :
                        log.type === 'warn' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`}>
                        [{log.type.toUpperCase()}]
                      </span>
                    </div>
                    <pre className="mt-1 whitespace-pre-wrap break-all">{log.message}</pre>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebugLogger;
