import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const News = () => {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasFetchedRef = useRef(false); // 一度だけ実行するためのフラグ
  
  // 認証状態を取得
  const { loading: authLoading } = useAuth();

  useEffect(() => {
    const fetchNews = async () => {
      // ガード節: 認証が完了し、まだフェッチしていない場合のみ実行
      if (authLoading || hasFetchedRef.current) {
        setLoading(false);
        return;
      }

      hasFetchedRef.current = true; // 実行フラグを立てる
      
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/news`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('ニュース情報の取得に失敗しました');
        }

        const data = await response.json();
        console.log('ニュースデータ:', data);
        
        if (data.success && Array.isArray(data.data)) {
          setNewsList(data.data);
        } else {
          setNewsList(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        setError('ニュース情報の取得に失敗しました。');
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [authLoading]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center">読み込み中...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center gap-4">
        <p className="text-red-500">{error}</p>
        <Link to="/" className="link-text">ホームに戻る</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pt-6">
      {/* Main Content */}
      <main className="main-content min-h-screen pb-20 w-full flex flex-col items-center">
        <div className="w-full max-w-4xl mx-auto px-2 md:px-4 lg:px-6">
          <div className="mb-8">
            <h1 className="page-title text-3xl md:text-4xl lg:text-5xl font-bold text-stone-800">ニュース</h1>
            <p className="text-stone-600 mt-2 text-base md:text-lg lg:text-xl">最新のお知らせやニュースをお伝えします</p>
          </div>

          {newsList.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-stone-600 mb-4 text-base md:text-lg lg:text-xl">ニュースはありません</p>
              <Link to="/" className="link-text">ホームに戻る</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {newsList.map((newsItem) => (
                <details key={newsItem.id} className="accordion-item bg-white border-b border-stone-200">
                  <summary className="flex items-center justify-between p-4 md:p-6 cursor-pointer hover:bg-stone-50 transition-colors focus:outline-none">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="font-bold text-mos-green text-lg md:text-xl lg:text-2xl flex-shrink-0 pt-0.5">Q</span>
                      <h2 className="text-base md:text-lg lg:text-xl font-bold text-stone-800 leading-relaxed">
                        {newsItem.title}
                      </h2>
                    </div>
                    {newsItem.is_published === 1 && (
                      <span className="ml-2 md:ml-4 bg-green-100 text-green-700 text-xs font-bold px-2 md:px-3 py-1 rounded-full flex-shrink-0">
                        公開中
                      </span>
                    )}
                    {/* Toggle Icon */}
                    <span className="toggle-icon text-mos-green font-bold text-xl md:text-2xl lg:text-3xl ml-2 flex-shrink-0 transition-transform duration-300">
                      +
                    </span>
                  </summary>

                  {/* Content */}
                  <div className="bg-gray-100 p-4 md:p-6 border-t border-stone-200">
                    <div className="flex gap-3">
                      <span className="font-bold text-orange-500 text-lg md:text-xl lg:text-2xl flex-shrink-0">A</span>
                      <div className="flex-1">
                        <div className="text-xs md:text-sm lg:text-base text-stone-500 mb-3">
                          {formatDate(newsItem.created_at)}
                        </div>
                        <p className="text-stone-700 text-sm md:text-base lg:text-lg leading-relaxed whitespace-pre-wrap">
                          {newsItem.content}
                        </p>
                      </div>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default News;
