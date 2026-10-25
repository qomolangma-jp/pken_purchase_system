import React from 'react';

/**
 * 送信中は disabled とスピナーを表示するボタン。
 */
const SubmitButton = ({
  loading = false,
  loadingText = '処理中...',
  disabled = false,
  className = '',
  children,
  type = 'button',
  ...rest
}) => (
  <button
    type={type}
    disabled={loading || disabled}
    aria-busy={loading}
    className={`inline-flex items-center justify-center gap-2 ${className}`}
    {...rest}
  >
    {loading && (
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        aria-hidden="true"
      />
    )}
    {loading ? loadingText : children}
  </button>
);

export default SubmitButton;
