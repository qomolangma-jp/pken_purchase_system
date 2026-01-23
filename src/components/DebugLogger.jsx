import React, { useState, useEffect } from 'react';

const DebugLogger = () => {
  const [logs, setLogs] = useState([]);
  const [isVisible, setIsVisible] = useState(true);
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
  if (!isVisible) return null;

  const getLogColor = (type) => {
    switch (type) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warn': return 'text-yellow-700 bg-yellow-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  return (
    <div 
      className={`fixed ${isMinimized ? 'bottom-4 right-4' : 'top-4 right-4 bottom-4 left-4'} pointer-events-none`}
      style={{ zIndex: 999999 }}
    >
      <div className={`${isMinimized ? 'w-auto' : 'w-full h-full'} pointer-events-auto`}>
        <div 
          className="bg-black bg-opacity-95 text-white rounded-lg shadow-2xl flex flex-col border-2 border-green-500" 
          style={{ height: isMinimized ? 'auto' : '100%', maxHeight: isMinimized ? 'auto' : '90vh' }}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-green-600">
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
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs font-mono">
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
                    <pre className="mt-1 whitespace-pre-wrap break-all text-gray-800">{log.message}</pre>
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
