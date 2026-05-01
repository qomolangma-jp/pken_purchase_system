import React from 'react';
import { useModal } from '../contexts/ModalContext';

const Modal = () => {
  const { modalConfig, closeModal, confirmModal } = useModal();

  if (!modalConfig) return null;

  const { type, title, message, data, confirmText, cancelText } = modalConfig;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 sm:p-0">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={closeModal}
      ></div>

      {/* Modal Card - Mobile Bottom Sheet style or Central Card */}
      <div className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl transform transition-all animate-in fade-in zoom-in duration-300 sm:my-8 sm:w-full sm:max-w-lg">
        <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center">
          {getIcon()}
          
          {title && (
            <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
              {title}
            </h3>
          )}
          
          {message && (
            <p className="text-gray-600 mb-6 whitespace-pre-wrap">
              {message}
            </p>
          )}

          {/* Dynamic Rich Content Area */}
          {data && (
            <div className="w-full bg-gray-50 rounded-2xl p-4 mb-6 text-left border border-gray-100">
              {data}
            </div>
          )}

          <div className="w-full flex flex-col gap-3 sm:flex-row-reverse sm:gap-4">
            <button
              type="button"
              className="w-full py-3.5 px-4 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 active:scale-95 transition-all shadow-md active:shadow-sm"
              onClick={confirmModal}
            >
              {confirmText}
            </button>
            {type === 'confirm' && (
              <button
                type="button"
                className="w-full py-3.5 px-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 active:scale-95 transition-all"
                onClick={closeModal}
              >
                {cancelText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
