import React from 'react';
import { X, Info, AlertTriangle } from 'lucide-react';

const NotificationBar = ({ message, type, onClose }) => {
  if (!message) return null;

  // typeによって色を変更
  // 停止（warning）は赤系、調理済（info）は琥珀色系
  const containerClass = type === 'warning' 
    ? 'bg-red-500 text-white' 
    : 'bg-amber-500 text-white';

  return (
    <div className={`${containerClass} w-full font-bold text-sm px-4 py-3 flex items-center justify-between shadow-md transition-all duration-300 relative z-[200]`}>
      <div className="flex items-center gap-2 pr-8">
        {type === 'warning' ? <AlertTriangle size={18} className="shrink-0" /> : <Info size={18} className="shrink-0" />}
        <span className="leading-tight">{message}</span>
      </div>
      <button 
        onClick={(e) => {
          console.log('X button clicked');
          onClose(e);
        }} 
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-black/10 rounded-full transition-colors flex items-center justify-center z-[210]"
        aria-label="閉じる"
      >
        <X size={20} />
      </button>
    </div>
  );
};

export default NotificationBar;
