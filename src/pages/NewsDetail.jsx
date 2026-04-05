import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NewsDetail = () => {
  const { id } = useParams();
  const [newsItem, setNewsItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasFetchedRef = useRef(false);
  const { loading: authLoading } = useAuth();

  useEffect(() => {
    const fetchNewsDetail = async () => {
      if (authLoading || hasFetchedRef.current) {
        setLoading(false);
        return;
      }

      hasFetchedRef.current = true;

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || ''}/api/news/${id}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('ニュース情報の取得に失敗しました');
        }

        const data = await response.json();
        console.log('ニュース詳細:', data);

        if (data.success && data.data) {
          setNewsItem(data.data);
        } else if (data.data) {
          setNewsItem(data.data);
        }
      } catch (err) {
        setError('ニュース情報の取得に失敗しました。');
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNewsDetail();
  }, [id, authLoading]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-stone-50 pt-20 px-8">
        <p className="text-stone-600">読み込み中...</p>
      </div>
    );
  }

  if (error || !newsItem) {
    return (
      <div className="min-h-screen bg-stone-50 pt-20">
        <main className="main-content min-h-screen pb-20 w-full flex flex-col items-center">
          <div
            className="w-full max-w-2xl mx-auto"
            style={{ paddingLeft: 'clamp(24px, 7vw, 120px)', paddingRight: 'clamp(24px, 7vw, 120px)' }}
          >
            <div className="text-center py-12">
              <p className="text-red-500 mb-6 text-base md:text-lg">
                {error || 'ニュースが見つかりません'}
              </p>
              <Link
                to="/news"
                className="inline-block bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 md:py-3 px-4 md:px-6 rounded-lg transition-colors"
              >
                ニュース一覧に戻る
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pt-20">
      <main className="main-content pb-20 w-full flex flex-col items-center">
        <article
          className="w-full max-w-2xl mx-auto"
          style={{ paddingLeft: 'clamp(24px, 7vw, 120px)', paddingRight: 'clamp(24px, 7vw, 120px)' }}
        >
          {/* Back Button */}
          <div className="mb-8">
            <Link
              to="/news"
              className="inline-flex items-center text-stone-700 hover:text-emerald-700 font-semibold transition-colors"
            >
              <span className="mr-2">←</span>
              ニュース一覧に戻る
            </Link>
          </div>

          {/* Article Header */}
          <header className="mb-8 md:mb-10">
            {/* Meta Information */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 mb-6">
              <time className="text-sm md:text-base text-stone-600 font-medium">
                {formatDate(newsItem.created_at)}
              </time>
              <div className="flex flex-wrap gap-2">
                {newsItem.category && (
                  <span className="inline-block bg-blue-100 text-blue-700 text-xs md:text-sm font-bold px-3 py-1 rounded-full">
                    {newsItem.category}
                  </span>
                )}
                {newsItem.is_published === 1 && (
                  <span className="inline-block bg-green-100 text-green-700 text-xs md:text-sm font-bold px-3 py-1 rounded-full">
                    公開中
                  </span>
                )}
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-stone-800 leading-tight mb-4">
              {newsItem.title}
            </h1>
          </header>

          {/* Article Content */}
          <div className="prose prose-sm md:prose-base lg:prose-lg max-w-none text-stone-700 leading-relaxed">
            <div className="bg-white rounded-lg border border-stone-200 p-6 md:p-8 lg:p-10">
              {newsItem.content ? (
                <p className="whitespace-pre-wrap text-base md:text-lg text-stone-700 leading-relaxed">
                  {newsItem.content}
                </p>
              ) : (
                <p className="text-stone-500 italic">本文がありません</p>
              )}
            </div>
          </div>

          {/* Footer with Back Button */}
          <div className="mt-12 md:mt-16 pt-8 md:pt-10 border-t border-stone-200">
            <Link
              to="/news"
              className="inline-block w-full md:w-auto text-center bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold py-3 md:py-4 px-6 md:px-8 rounded-lg transition-colors duration-200"
            >
              ニュース一覧に戻る
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
};

export default NewsDetail;
