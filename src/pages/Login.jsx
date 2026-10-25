import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, authError, liff, liffInitialized } = useAuth();

  // すでにログイン済みの場合はトップページへリダイレクト
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // LINEログイン後はLIFFが発行したIDトークンを AuthContext がバックエンドへ送って認証する
  const handleLineLogin = () => {
    setError('');
    if (!liffInitialized) {
      setError('LINEログインを開始できません。LINEアプリ内で開くか、時間をおいて再度お試しください。');
      return;
    }
    liff.login({ redirectUri: `${window.location.origin}/` });
  };

  return (
    <div className="min-h-screen bg-stone-100 pt-12 pb-8 flex flex-col items-center justify-center">
      <main className="w-full max-w-md px-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h1 className="text-xl font-bold text-center mb-6 text-stone-800">ログイン</h1>

          {(error || authError) && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl mb-4 text-xs">
              {error || authError}
            </div>
          )}

          <button
            onClick={handleLineLogin}
            className="w-full flex items-center justify-center gap-2.5 bg-[#06C755] hover:bg-[#05b34b] text-white font-bold py-3 px-4 rounded-xl transition-all text-sm shadow-sm active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
            </svg>
            LINEでログイン
          </button>

          <div className="mt-8 pt-5 border-t border-stone-100 text-center">
            <div className="px-2">
              <Link to="/register" className="inline-block w-full py-3 rounded-xl bg-orange-50 text-orange-600 font-bold hover:bg-orange-100 transition-all text-sm border border-orange-200">
                初めての方はこちら（新規登録）
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
