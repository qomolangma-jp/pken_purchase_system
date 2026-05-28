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
    <div className={`${containerClass} w-full font-bold text-sm px-4 py-3 flex items-center justify-between shadow-md transition-all duration-300`}>
      <div className="flex items-center gap-2">
        {type === 'warning' ? <AlertTriangle size={18} /> : <Info size={18} />}
        <span>{message}</span>
      </div>
      <button 
        onClick={onClose} 
        className="p-1 hover:bg-black/10 rounded-full transition-colors flex items-center justify-center"
        aria-label="閉じる"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default NotificationBar;
