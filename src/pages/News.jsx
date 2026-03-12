import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const News = () => {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
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
  }, []);

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
    <div className="min-h-screen bg-stone-50 pt-24">
      {/* Main Content */}
      <main className="main-content min-h-screen pb-20">
        <div className="container">
          <div className="mb-8">
            <h1 className="page-title text-3xl font-bold text-stone-800">ニュース</h1>
            <p className="text-stone-600 mt-2">最新のお知らせやニュースをお伝えします</p>
          </div>

          {newsList.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-stone-600 mb-4">ニュースはありません</p>
              <Link to="/" className="link-text">ホームに戻る</Link>
            </div>
          ) : (
            <div className="space-y-6">
              {newsList.map((newsItem) => (
                <div key={newsItem.id} className="bg-white rounded-lg shadow-sm p-6 md:p-8">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-stone-800 flex-1">
                      {newsItem.title}
                    </h2>
                    {newsItem.is_published === 1 && (
                      <span className="ml-4 bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex-shrink-0">
                        公開中
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-stone-500 mb-4">
                    {formatDate(newsItem.created_at)}
                  </div>

                  <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">
                    {newsItem.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default News;
