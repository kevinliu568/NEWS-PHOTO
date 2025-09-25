import React from 'react';
import { ImageStyle } from '../types';

interface StyleSelectorProps {
  onSelect: (style: ImageStyle) => void;
  selectedStyle: ImageStyle | null;
}

const StyleSelector: React.FC<StyleSelectorProps> = ({ onSelect, selectedStyle }) => {
  const styles = Object.values(ImageStyle);

  return (
    <div className="my-8">
      <h3 className="font-semibold text-lg mb-4 text-center text-indigo-300">請選擇圖像風格</h3>
      <div className="flex flex-wrap justify-center gap-3">
        {styles.map((style) => (
          <button
            key={style}
            onClick={() => onSelect(style)}
            className={`
              px-5 py-2 border-2 rounded-lg font-semibold transition-all duration-200
              ${selectedStyle === style
                ? 'bg-indigo-500 border-indigo-400 text-white scale-105 shadow-md'
                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500'
              }
            `}
          >
            {style}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StyleSelector;
