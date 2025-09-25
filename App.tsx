import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { AppStage, NewsHeadline, ImagePrompt, ImageStyle, NewsSource, GenerationItem } from './types';
import { fetchNewsHeadlines, generateImagePrompt, generateImage, editImage } from './services/geminiService';
import StepIndicator from './components/StepIndicator';
import LoadingSpinner from './components/LoadingSpinner';
import ActionButton from './components/ActionButton';
import ProgressBar from './components/ProgressBar';
import StyleSelector from './components/StyleSelector';

type GenerationMode = 'merge' | 'individual';

const StarRating: React.FC<{ rating: number; className?: string }> = ({ rating = 0, className = '' }) => {
  return (
    <div className={`flex ${className}`}>
      {[...Array(5)].map((_, index) => (
        <svg 
          key={index}
          className={`w-5 h-5 ${index < rating ? 'text-yellow-400' : 'text-gray-600'}`} 
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.INITIAL);
  const [newsHeadlines, setNewsHeadlines] = useState<NewsHeadline[]>([]);
  const [newsSources, setNewsSources] = useState<NewsSource[]>([]);
  const [generationItems, setGenerationItems] = useState<GenerationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [imageStyle, setImageStyle] = useState<ImageStyle | null>(null);

  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [currentPromptEdits, setCurrentPromptEdits] = useState<ImagePrompt | null>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [imageEditInstruction, setImageEditInstruction] = useState<string>('');
  
  const isLoading = stage === AppStage.NEWS_FETCHING || stage === AppStage.PROMPT_GENERATING || stage === AppStage.IMAGE_GENERATING || stage === AppStage.IMAGE_EDITING;

  useEffect(() => {
    if (stage !== AppStage.IMAGE_GENERATING && stage !== AppStage.IMAGE_EDITING) {
      return;
    }

    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        const increment = prev < 80 ? Math.random() * 3 : Math.random() * 1;
        return Math.min(prev + increment, 95);
      });
    }, 150);

    return () => clearInterval(interval);
  }, [stage]);

  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : '發生未知錯誤';
    setError(message);
    setStage(AppStage.INITIAL); // Reset on error
    setProgress(0);
  };

  const handleFetchNews = useCallback(async () => {
    setError(null);
    setStage(AppStage.NEWS_FETCHING);
    setLoadingMessage('正在為您搜尋今日即時焦點...');
    try {
      const { headlines, sources } = await fetchNewsHeadlines();
      if (headlines.length === 0) {
        setError("抱歉，AI 目前找不到相關的即時新聞，請稍後再試一次。");
        setStage(AppStage.INITIAL);
        return;
      }
      const headlinesWithId = headlines.map((h, index) => ({ ...h, id: index, isSelected: false }));
      setNewsHeadlines(headlinesWithId);
      setNewsSources(sources);
      setStage(AppStage.NEWS_FETCHED);
    } catch (err) {
      handleError(err);
    }
  }, []);

  const handleToggleSelection = useCallback((idToToggle: number) => {
    setNewsHeadlines(prev =>
      prev.map(headline =>
        headline.id === idToToggle ? { ...headline, isSelected: !headline.isSelected } : headline
      )
    );
  }, []);

  const handleProceedToPromptGeneration = useCallback(async (mode: GenerationMode) => {
    const selected = newsHeadlines.filter(h => h.isSelected);
    if (selected.length === 0) return;
    
    setError(null);
    setStage(AppStage.PROMPT_GENERATING);
    setLoadingMessage('AI 正在將新聞轉化為藝術靈感...');
    setImageStyle(null);
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      if (mode === 'merge') {
        const prompt = await generateImagePrompt(selected);
        setGenerationItems([{ id: 'merged', source: selected, prompt, imageUrl: null }]);
      } else { // individual
        const prompts = await Promise.all(selected.map(h => generateImagePrompt([h])));
        const items = selected.map((h, i) => ({
          id: h.id.toString(),
          source: [h],
          prompt: prompts[i],
          imageUrl: null,
        }));
        setGenerationItems(items);
      }
      setStage(AppStage.PROMPT_GENERATED);
    } catch (err) {
      handleError(err);
    }
  }, [newsHeadlines]);
  
  const handleGenerateImage = useCallback(async () => {
    if (generationItems.length === 0 || !imageStyle) return;
    
    setError(null);
    setStage(AppStage.IMAGE_GENERATING);
    setLoadingMessage('AI 繪圖師正在揮灑創意，請稍候...');

    const styleToPromptPrefix: { [key in ImageStyle]: string } = {
        [ImageStyle.REALISTIC]: 'Photorealistic, cinematic style',
        [ImageStyle.OIL_PAINTING]: 'An expressive oil painting',
        [ImageStyle.CARTOON]: 'A vibrant, detailed cartoon style',
        [ImageStyle.WATERCOLOR]: 'A beautiful watercolor painting',
    };

    try {
      const imagePromises = generationItems.map(item => {
        if (!item.prompt) return Promise.resolve(null);
        const finalPrompt = `${styleToPromptPrefix[imageStyle]}. ${item.prompt.english}`;
        return generateImage(finalPrompt);
      });

      const imageUrls = await Promise.all(imagePromises);

      const updatedItems = generationItems.map((item, i) => ({
        ...item,
        imageUrl: imageUrls[i],
      }));
      
      setGenerationItems(updatedItems);

      setProgress(100);
      setTimeout(() => {
        setStage(AppStage.IMAGE_GENERATED);
      }, 500);
    } catch (err) {
      handleError(err);
    }
  }, [generationItems, imageStyle]);

  // Prompt Editing Handlers
  const handleEditPrompt = (itemId: string) => {
    const itemToEdit = generationItems.find(item => item.id === itemId);
    if (itemToEdit && itemToEdit.prompt) {
      setEditingPromptId(itemId);
      setCurrentPromptEdits(JSON.parse(JSON.stringify(itemToEdit.prompt)));
    }
  };

  const handleCancelEditPrompt = () => {
    setEditingPromptId(null);
    setCurrentPromptEdits(null);
  };

  const handleSavePrompt = () => {
    if (!editingPromptId || !currentPromptEdits) return;
    setGenerationItems(prevItems =>
      prevItems.map(item =>
        item.id === editingPromptId ? { ...item, prompt: currentPromptEdits } : item
      )
    );
    setEditingPromptId(null);
    setCurrentPromptEdits(null);
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!currentPromptEdits) return;
    const { name, value } = e.target;
    setCurrentPromptEdits({
      ...currentPromptEdits,
      [name]: value,
    });
  };

  // Image Editing Handlers
  const handleStartEditImage = (itemId: string) => {
    setEditingImageId(itemId);
    setImageEditInstruction('');
  };

  const handleCancelEditImage = () => {
    setEditingImageId(null);
    setImageEditInstruction('');
  };

  const handleConfirmEditImage = async () => {
    if (!editingImageId || !imageEditInstruction) return;
    const itemToEdit = generationItems.find(item => item.id === editingImageId);
    if (!itemToEdit || !itemToEdit.imageUrl) return;

    setError(null);
    setStage(AppStage.IMAGE_EDITING);
    setLoadingMessage('AI 正在根據您的指示修改圖片...');

    try {
      const [header, base64Data] = itemToEdit.imageUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
      
      const newImageUrl = await editImage(base64Data, mimeType, imageEditInstruction);

      setGenerationItems(prevItems =>
        prevItems.map(item =>
          item.id === editingImageId ? { ...item, imageUrl: newImageUrl } : item
        )
      );
      setEditingImageId(null);
      setImageEditInstruction('');
      setStage(AppStage.IMAGE_GENERATED);
    } catch (err) {
      handleError(err);
    }
  };


  const handleGoBackToNews = () => {
    setGenerationItems([]);
    setError(null);
    setImageStyle(null);
    setStage(AppStage.NEWS_FETCHED);
  };

  const handleReset = () => {
    setStage(AppStage.INITIAL);
    setNewsHeadlines([]);
    setNewsSources([]);
    setGenerationItems([]);
    setError(null);
    setProgress(0);
    setImageStyle(null);
  };

  const handleDownloadImage = useCallback((imageUrl: string | null, headlines: NewsHeadline[]) => {
    if (!imageUrl || headlines.length === 0) return;

    const link = document.createElement('a');
    link.href = imageUrl;
    
    const safeTitle = headlines[0].title.replace(/[\\/:*?"<>|]/g, '');
    const filename = safeTitle.substring(0, 10).trim() + '.png';
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);
  
  const selectedCount = useMemo(() => newsHeadlines.filter(h => h.isSelected).length, [newsHeadlines]);

  const renderContent = () => {
    if (isLoading) {
      if (stage === AppStage.IMAGE_GENERATING || stage === AppStage.IMAGE_EDITING) {
        return <ProgressBar progress={progress} message={loadingMessage} />;
      }
      return <LoadingSpinner message={loadingMessage} />;
    }

    if (error) {
        return (
            <div className="text-center p-8 bg-red-900/50 rounded-lg">
                <p className="text-red-300 mb-4">{error}</p>
                <ActionButton onClick={handleReset}>重新開始</ActionButton>
            </div>
        );
    }

    switch (stage) {
      case AppStage.INITIAL:
        return (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">準備好將新聞化為圖像了嗎？</h2>
            <p className="text-gray-400 mb-8">點擊下方按鈕，讓 AI 為您搜尋今日的即時焦點新聞。</p>
            <ActionButton onClick={handleFetchNews}>搜尋今日即時焦點新聞</ActionButton>
          </div>
        );
      
      case AppStage.NEWS_FETCHED:
        const sortedHeadlines = [...newsHeadlines].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        return (
          <div className="w-full">
            <h2 className="text-2xl font-bold text-center mb-6">請選擇感興趣的新聞（可多選）</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedHeadlines.map((headline) => (
                <div
                  key={headline.id}
                  onClick={() => handleToggleSelection(headline.id)}
                  className={`
                    bg-gray-800 rounded-lg border-2 
                    transition-all duration-300 flex flex-col justify-between p-6 cursor-pointer
                    ${headline.isSelected ? 'border-indigo-500 bg-gray-700/50 scale-[1.02]' : 'border-transparent hover:border-indigo-600 hover:bg-gray-700/50'}
                  `}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-indigo-300 flex-1 pr-2">{headline.title}</h3>
                        <StarRating rating={headline.rating} />
                    </div>
                    <p className="text-gray-400 text-sm mb-3">{headline.summary}</p>
                  </div>
                  {headline.sourceUrl && headline.sourceTitle && (
                    <div className="text-xs text-gray-500 mt-auto pt-2">
                      <span>來源: </span>
                      <a
                        href={headline.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-indigo-400 transition-colors underline"
                      >
                        {headline.sourceTitle}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              {selectedCount > 1 ? (
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <ActionButton onClick={() => handleProceedToPromptGeneration('merge')}>
                    融合生成 ({selectedCount}則)
                  </ActionButton>
                  <ActionButton onClick={() => handleProceedToPromptGeneration('individual')}>
                    獨立生成 ({selectedCount}則)
                  </ActionButton>
                </div>
              ) : (
                <ActionButton 
                  onClick={() => handleProceedToPromptGeneration('individual')}
                  disabled={selectedCount === 0}
                >
                  {selectedCount > 0 ? `以 ${selectedCount} 則新聞生成提示詞` : '請選擇至少一則新聞'}
                </ActionButton>
              )}
            </div>
          </div>
        );

      case AppStage.PROMPT_GENERATED:
        return (
          <div className="text-center w-full">
            <h2 className="text-2xl font-bold mb-6">AI 生成的圖像提示詞</h2>
            <div className="space-y-8 max-w-3xl mx-auto">
              {generationItems.map(item => (
                <div key={item.id} className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                   <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-indigo-300">靈感來源: {item.source.map(s => s.title).join(' & ')}</h3>
                         {editingPromptId !== item.id && (
                             <button onClick={() => handleEditPrompt(item.id)} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">編輯提示詞</button>
                         )}
                   </div>
                  {editingPromptId === item.id ? (
                      <div className="space-y-4">
                           <div>
                               <label htmlFor="chinese-prompt" className="block font-semibold text-md mb-2 text-indigo-400 text-left">中文提示詞</label>
                               <textarea
                                   id="chinese-prompt"
                                   name="chinese"
                                   value={currentPromptEdits?.chinese || ''}
                                   onChange={handlePromptChange}
                                   rows={3}
                                   className="w-full bg-gray-800/80 p-2 rounded-md text-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                               />
                           </div>
                           <div>
                               <label htmlFor="english-prompt" className="block font-semibold text-md mb-2 text-indigo-400 text-left">英文提示詞</label>
                               <textarea
                                   id="english-prompt"
                                   name="english"
                                   value={currentPromptEdits?.english || ''}
                                   onChange={handlePromptChange}
                                   rows={5}
                                   className="w-full bg-gray-800/80 p-2 rounded-md text-gray-300 font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                               />
                           </div>
                           <div className="flex gap-4 justify-end">
                               <ActionButton onClick={handleCancelEditPrompt} className="text-sm py-2 px-4 bg-gray-600 hover:bg-gray-500">取消</ActionButton>
                               <ActionButton onClick={handleSavePrompt} className="text-sm py-2 px-4">儲存</ActionButton>
                           </div>
                       </div>
                  ) : (
                    <div className="space-y-4 text-left">
                       <div>
                          <h4 className="font-semibold text-md mb-2 text-indigo-400">中文提示詞</h4>
                          <div className="bg-gray-800/60 p-3 rounded-md">
                             <p className="text-gray-300 italic text-sm">"{item.prompt?.chinese}"</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-md mb-2 text-indigo-400">英文提示詞 (用於生成)</h4>
                          <div className="bg-gray-800/60 p-3 rounded-md">
                             <p className="text-gray-300 italic font-mono text-sm">"{item.prompt?.english}"</p>
                          </div>
                        </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <StyleSelector onSelect={setImageStyle} selectedStyle={imageStyle} />

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
              <ActionButton 
                onClick={handleGoBackToNews} 
                className="bg-gray-600 hover:bg-gray-500"
              >
                重新選擇新聞
              </ActionButton>
              <ActionButton 
                onClick={handleGenerateImage}
                disabled={!imageStyle || !!editingPromptId}
              >
                {imageStyle ? `以 ${imageStyle} 風格生成` : '請先選擇風格'}
              </ActionButton>
            </div>
          </div>
        );

      case AppStage.IMAGE_GENERATED:
        return (
            <div className="w-full">
                <h2 className="text-2xl font-bold mb-8 text-center">您的新聞靈感畫作</h2>
                <div className="space-y-10">
                    {generationItems.map(item => (
                        <div key={item.id} className="text-center bg-gray-900/30 p-4 sm:p-6 rounded-lg border border-gray-700">
                            {item.imageUrl && (
                                <img src={item.imageUrl} alt={`Generated from ${item.source[0].title}`} className="rounded-lg shadow-2xl mx-auto mb-6 max-w-full h-auto md:max-w-2xl" />
                            )}
                            <div className="max-w-2xl mx-auto text-left bg-gray-900/50 p-4 rounded-lg mb-6 border border-gray-700">
                                <h3 className="font-bold text-lg text-indigo-300 mb-3">靈感來源新聞:</h3>
                                <ul className="list-disc list-inside space-y-2">
                                    {item.source.map(headline => (
                                        <li key={headline.id} className="text-gray-400">
                                            <span className="font-semibold text-gray-300">{headline.title}</span>
                                            {' - '}
                                            <a
                                                href={headline.sourceUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-gray-500 hover:text-indigo-400 transition-colors underline"
                                                >
                                                {headline.sourceTitle}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                              {editingImageId === item.id ? (
                                <div className="max-w-2xl mx-auto my-4">
                                  <label htmlFor="image-edit-instruction" className="block font-semibold text-md mb-2 text-indigo-300">請輸入修改指令</label>
                                  <input 
                                    id="image-edit-instruction"
                                    type="text"
                                    value={imageEditInstruction}
                                    onChange={(e) => setImageEditInstruction(e.target.value)}
                                    placeholder="例如: 幫他加上一副太陽眼鏡"
                                    className="w-full bg-gray-800/80 p-3 rounded-md text-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    autoFocus
                                  />
                                  <div className="flex gap-4 justify-center mt-4">
                                    <ActionButton onClick={handleCancelEditImage} className="text-sm py-2 px-4 bg-gray-600 hover:bg-gray-500">取消</ActionButton>
                                    <ActionButton onClick={handleConfirmEditImage} disabled={!imageEditInstruction.trim()} className="text-sm py-2 px-4">確認修改</ActionButton>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-4 justify-center">
                                   <ActionButton 
                                      onClick={() => handleDownloadImage(item.imageUrl, item.source)}
                                      className="bg-green-600 hover:bg-green-500 text-sm py-2 px-4"
                                    >
                                      下載圖片
                                    </ActionButton>
                                    <ActionButton 
                                      onClick={() => handleStartEditImage(item.id)}
                                      className="bg-purple-600 hover:bg-purple-500 text-sm py-2 px-4"
                                    >
                                      修改圖片
                                    </ActionButton>
                                </div>
                              )}
                        </div>
                    ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
                  <ActionButton 
                    onClick={handleGoBackToNews}
                    className="bg-gray-600 hover:bg-gray-500"
                  >
                    重新選擇新聞
                  </ActionButton>
                  <ActionButton 
                    onClick={handleReset}
                  >
                    全部重新開始
                  </ActionButton>
                </div>
            </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="my-8">
          <div className="text-center">
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">
                新聞靈感繪圖師
              </h1>
              <p className="mt-2 text-md sm:text-lg text-gray-400">從每日頭條到視覺傑作</p>
          </div>
        </header>
        
        <main>
          <StepIndicator currentStage={stage} />
          <div className="mt-10 bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-6 sm:p-10 border border-gray-700 min-h-[300px] flex items-center justify-center">
              {renderContent()}
          </div>
        </main>

        <footer className="text-center text-gray-500 mt-12 text-sm">
            <p>由 Google Gemini API 強力驅動</p>
        </footer>
      </div>
    </div>
  );
};

export default App;