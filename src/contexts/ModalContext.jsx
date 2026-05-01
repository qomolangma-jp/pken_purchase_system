import React, { createContext, useContext, useState, useCallback } from 'react';

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [modalConfig, setModalConfig] = useState(null);

  const openModal = useCallback((config) => {
    setModalConfig({
      type: 'info',
      title: '',
      message: '',
      data: null,
      onConfirm: null,
      onClose: null,
      confirmText: 'OK',
      cancelText: 'キャンセル',
      ...config,
    });
  }, []);

  const closeModal = useCallback(() => {
    if (modalConfig?.onClose) {
      modalConfig.onClose();
    }
    setModalConfig(null);
  }, [modalConfig]);

  const confirmModal = useCallback(() => {
    if (modalConfig?.onConfirm) {
      modalConfig.onConfirm();
    }
    setModalConfig(null);
  }, [modalConfig]);

  return (
    <ModalContext.Provider value={{ openModal, closeModal, confirmModal, modalConfig }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
