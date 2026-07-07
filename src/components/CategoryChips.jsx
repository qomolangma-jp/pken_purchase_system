import React, { useRef } from 'react';
import { Search } from 'lucide-react';

/**
 * CategoryChips - カテゴリタブコンポーネント
 */
const CategoryChips = ({
  categories = [],
  activeCategory = '',
  onCategoryChange = () => {},
  onSearchClick = () => {},
  bgColor = '#ffffff',
}) => {
  const scrollContainerRef = useRef(null);
  const buttonRefs = useRef({});

  React.useEffect(() => {
    const activeButton = buttonRefs.current[activeCategory];
    if (activeButton && scrollContainerRef.current) {
      activeButton.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeCategory]);

  return (
    <nav
      className="sticky z-50 flex items-center bg-white border-b"
      style={{
        top: '56px',
        backgroundColor: bgColor,
      }}
    >
      {/* 検索・絞り込みボタン（固定） */}
      <div className="flex-shrink-0 p-2 pl-4 border-r border-gray-100 flex items-center justify-center bg-white">
        <button
          onClick={onSearchClick}
          className="w-9 h-9 rounded-full border border-gray-100 flex items-center justify-center text-gray-500 shadow-sm hover:bg-gray-50 transition-colors"
          aria-label="検索"
        >
          <Search size={18} />
        </button>
      </div>

      {/* カテゴリタブコンテナ */}
      <div
        ref={scrollContainerRef}
        className="flex flex-wrap items-center flex-1 bg-white"
        style={{
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {categories.map((category) => {
          const isActive = activeCategory === category;

          return (
            <button
              key={category}
              ref={(el) => {
                if (el) buttonRefs.current[category] = el;
              }}
              onClick={() => onCategoryChange(category)}
              className={`
                flex-shrink-0 px-5 py-3.5
                text-[15px] font-bold whitespace-nowrap
                transition-all duration-200 border-b-4
                ${
                  isActive
                    ? 'text-black border-black'
                    : 'text-gray-400 border-transparent'
                }
              `}
            >
              {category}
            </button>
          );
        })}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </nav>
  );
};

export default CategoryChips;
