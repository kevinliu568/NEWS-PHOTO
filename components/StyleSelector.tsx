import React from 'react';
import { ImageStyle, ImageTextLanguage } from '../types';

interface StyleSelectorProps {
  onSelectStyle: (style: ImageStyle) => void;
  selectedStyle: ImageStyle | null;
  onSelectLanguage: (lang: ImageTextLanguage) => void;
  selectedLanguage: ImageTextLanguage;
}

const StyleSelector: React.FC<StyleSelectorProps> = ({ 
  onSelectStyle, 
  selectedStyle, 
  onSelectLanguage, 
  selectedLanguage 
}) => {
  const styles = Object.values(ImageStyle);
  const languages = Object.values(ImageTextLanguage);

  return (
    <div className="my-8 space-y-8">
      <div>
        <h3 className="font-semibold text-lg mb-4 text-center text-indigo-300">請選擇圖像風格</h3>
        <div className="flex flex-wrap justify-center gap-3">
          {styles.map((style) => (
            <button
              key={style}
              onClick={() => onSelectStyle(style)}
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

      <div>
        <h3 className="font-semibold text-lg mb-4 text-center text-indigo-300">圖卡文字語言</h3>
        <div className="flex flex-wrap justify-center gap-3">
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => onSelectLanguage(lang)}
              className={`
                px-5 py-2 border-2 rounded-lg font-semibold transition-all duration-200
                ${selectedLanguage === lang
                  ? 'bg-purple-500 border-purple-400 text-white scale-105 shadow-md'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500'
                }
              `}
            >
              {lang}
            </button>
          ))}
        </div>
        <p className="text-xs text-center text-gray-500 mt-2">註：選擇語系後，AI 會嘗試在畫面中融入對應文字（如標題或數據標籤）。</p>
      </div>
    </div>
  );
};

export default StyleSelector;