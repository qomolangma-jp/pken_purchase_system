import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// import liff from '@line/liff'; // 実際のLIFFを使用する場合はコメントアウトを外す

const Register = () => {
  const [name2nd, setName2nd] = useState('');
  const [name1st, setName1st] = useState('');
  const [lineId, setLineId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Mock LIFF initialization
    // In a real app, liff.init() would happen here
    // For demo, we set a mock LINE ID
    const mockLineId = "U1234567890abcdef";
    setLineId(mockLineId);
    console.log('LIFF initialized (mock), LINE ID set:', mockLineId);

    /*
    // 実際のLIFF初期化コード例
    liff.init({ liffId: "YOUR_LIFF_ID" })
      .then(() => {
        if (liff.isLoggedIn()) {
          liff.getProfile().then(profile => {
            setLineId(profile.userId);
          });
        } else {
          liff.login();
        }
      })
      .catch((err) => {
        console.error('LIFF Initialization failed', err);
      });
    */
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Register:', { name_2nd: name2nd, name_1st: name1st, line_id: lineId });
    
    // Simulate registration success
    alert('登録しました（デモ）\n姓: ' + name2nd + '\n名: ' + name1st + '\nLINE ID: ' + lineId);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="logo">Mobile Order</Link>
          <Link to="/" className="text-sm text-stone-600">トップへ戻る</Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content min-h-screen">
        <div className="container container-narrow py-10">
          <h1 className="page-title">新規登録</h1>

          <form id="registerForm" className="form-card" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="name_2nd">姓</label>
              <input
                id="name_2nd"
                type="text"
                className="form-input"
                placeholder="山田"
                required
                value={name2nd}
                onChange={(e) => setName2nd(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="name_1st">名</label>
              <input
                id="name_1st"
                type="text"
                className="form-input"
                placeholder="太郎"
                required
                value={name1st}
                onChange={(e) => setName1st(e.target.value)}
              />
            </div>

            {/* LINE ID (Hidden or Readonly) */}
            <div className="form-group">
              <label className="form-label" htmlFor="line_id">LINE ID</label>
              <input
                id="line_id"
                type="text"
                className="form-input bg-stone-100"
                placeholder="LIFFから自動取得"
                readOnly
                required
                value={lineId}
              />
              <p className="text-xs text-stone-500 mt-1">※LINE IDは自動的に取得されます</p>
            </div>

            <button type="submit" className="btn-primary">登録する</button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="link-text">すでにアカウントをお持ちの方はこちら</Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Register;
