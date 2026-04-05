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
    return <div className="min-h-screen flex justify-center items-center px-8">読み込み中...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center gap-4 px-8">
        <p className="text-red-500">{error}</p>
        <Link to="/" className="link-text">ホームに戻る</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pt-6">
      {/* Main Content */}
      <main className="main-content min-h-screen pb-20 w-full flex flex-col items-center">
        <div
          className="w-full max-w-4xl mx-auto"
          style={{ paddingLeft: 'clamp(24px, 7vw, 120px)', paddingRight: 'clamp(24px, 7vw, 120px)' }}
        >
          {/* Header Section */}
          <div className="mb-10">
            <h1 className="page-title text-3xl md:text-4xl lg:text-5xl font-bold text-stone-800 mb-3">ニュース</h1>
            <p className="text-stone-600 text-base md:text-lg">最新のお知らせやニュースをお伝えします</p>
          </div>

          {newsList.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-stone-600 mb-4 text-base md:text-lg">ニュースはありません</p>
              <Link to="/" className="link-text">ホームに戻る</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {newsList.map((newsItem) => (
                <Link
                  key={newsItem.id}
                  to={`/news/${newsItem.id}`}
                  className="block bg-white rounded-lg border border-stone-200 hover:shadow-md hover:border-stone-300 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                >
                  <article className="p-4 md:p-6 lg:p-7">
                    {/* Top Info Row */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 mb-3">
                      <time className="text-xs md:text-sm text-stone-500 font-medium">
                        {formatDate(newsItem.created_at)}
                      </time>
                      {newsItem.category && (
                        <span className="inline-block bg-blue-100 text-blue-700 text-xs md:text-sm font-bold px-3 py-1 rounded-full w-fit">
                          {newsItem.category}
                        </span>
                      )}
                      {newsItem.is_published === 1 && (
                        <span className="inline-block bg-green-100 text-green-700 text-xs md:text-sm font-bold px-3 py-1 rounded-full w-fit">
                          公開中
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-stone-800 mb-3 line-clamp-2 hover:text-blue-600 transition-colors">
                      {newsItem.title}
                    </h2>

                    {/* Preview */}
                    {newsItem.content && (
                      <p className="text-sm md:text-base text-stone-600 line-clamp-2">
                        {newsItem.content}
                      </p>
                    )}
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default News;
