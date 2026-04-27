import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const News = () => {
  const [newsList, setNewsList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);
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

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm('本当にこのニュースを削除しますか？')) {
      return;
    }

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      if (baseUrl) {
        await fetch(`${baseUrl}/api/news/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      setDeletingId(id);
      // アニメーションのために待機
      setTimeout(() => {
        setNewsList(prev => prev.filter(item => item.id !== id));
        setDeletingId(null);
      }, 300);

    } catch (err) {
      console.error('Delete error:', err);
      // エラーでもUI上は消す処理を継続（またはエラー通知）
      setDeletingId(id);
      setTimeout(() => {
        setNewsList(prev => prev.filter(item => item.id !== id));
        setDeletingId(null);
      }, 300);
    }
  };

  const filteredNews = newsList.filter(item => {
    const title = item.title?.toLowerCase() || '';
    const content = item.content?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return title.includes(search) || content.includes(search);
  });

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
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="mb-10 text-center">
            <h1 className="page-title text-3xl md:text-4xl lg:text-5xl font-bold text-stone-800 mb-3">ニュース</h1>
            <p className="text-stone-600 text-base md:text-lg mb-8">最新のお知らせやニュースをお伝えします</p>

            {/* Keyword Search UI */}
            <div className="max-w-md mx-auto mb-8 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="ニュースを検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              />
            </div>
          </div>

          {filteredNews.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg border border-dashed border-stone-300">
              <p className="text-stone-600 mb-4 text-base md:text-lg">該当するニュースはありません</p>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  検索リセット
                </button>
              )}
              {!searchTerm && <Link to="/" className="link-text">ホームに戻る</Link>}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredNews.map((newsItem) => (
                <div
                  key={newsItem.id}
                  className={`transition-all duration-300 ${deletingId === newsItem.id ? 'opacity-0 scale-95 translate-x-4' : 'opacity-100'}`}
                >
                  <Link
                    to={`/news/${newsItem.id}`}
                    className="block bg-white rounded-lg border border-stone-200 hover:shadow-md hover:border-stone-300 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden relative"
                  >
                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDelete(e, newsItem.id)}
                      className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-red-500 transition-colors bg-white/80 rounded-full hover:bg-stone-50"
                      title="削除"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    <article className="p-4 md:p-6 lg:p-7">
                      {/* Top Info Row */}
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 mb-3 pr-10">
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
