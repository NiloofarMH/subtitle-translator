
import React, { useState, useRef, useCallback } from 'react';
import { parseSRT, stringifySRT } from './utils/srtParser';
import { translateChunks } from './services/geminiService';
import { TranslationDirection, TranslationState, SubtitleBlock } from './types';

const CHUNK_SIZE = 30; // Number of subtitle blocks per API call

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [direction, setDirection] = useState<TranslationDirection>(TranslationDirection.EN_TO_FA);
  const [status, setStatus] = useState<TranslationState>({
    isTranslating: false,
    progress: 0,
    error: null,
    result: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus(prev => ({ ...prev, result: null, error: null, progress: 0 }));
    }
  };

  const handleTranslate = async () => {
    if (!file) return;

    setStatus({ isTranslating: true, progress: 0, error: null, result: null });

    try {
      const content = await file.text();
      const blocks = parseSRT(content);
      
      if (blocks.length === 0) {
        throw new Error("No subtitle lines found in the file. Ensure it's a valid .srt or .txt format.");
      }

      const totalChunks = Math.ceil(blocks.length / CHUNK_SIZE);
      const translatedBlocks: SubtitleBlock[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const chunk = blocks.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const textsToTranslate = chunk.map(b => b.text);
        
        // Small delay to avoid rate limits if any
        if (i > 0) await new Promise(r => setTimeout(r, 500));

        const translatedTexts = await translateChunks(textsToTranslate, direction);

        // Map back to blocks
        chunk.forEach((block, index) => {
          translatedBlocks.push({
            ...block,
            text: translatedTexts[index] || block.text // Fallback to original if missing
          });
        });

        const currentProgress = Math.round(((i + 1) / totalChunks) * 100);
        setStatus(prev => ({ ...prev, progress: currentProgress }));
      }

      const finalSRT = stringifySRT(translatedBlocks);
      setStatus(prev => ({ ...prev, isTranslating: false, result: finalSRT }));

    } catch (err: any) {
      console.error(err);
      setStatus(prev => ({ 
        ...prev, 
        isTranslating: false, 
        error: err.message || "An unexpected error occurred during translation." 
      }));
    }
  };

  const handleDownload = () => {
    if (!status.result || !file) return;

    const blob = new Blob([status.result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    // Suggest a name: original_name_translated.srt
    const originalName = file.name.replace(/\.[^/.]+$/, "");
    a.href = url;
    a.download = `${originalName}_translated_${direction}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleDirection = () => {
    setDirection(prev => 
      prev === TranslationDirection.EN_TO_FA 
        ? TranslationDirection.FA_TO_EN 
        : TranslationDirection.EN_TO_FA
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-indigo-50 to-blue-100">
      
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-indigo-900 mb-2">
          Subtitles Translator
        </h1>
        <p className="text-indigo-600 font-medium">
          Fast, smart, and precise translations powered by Gemini AI
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-xl glass-card rounded-3xl shadow-2xl p-6 md:p-10 space-y-8">
        
        {/* Upload Section */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-indigo-50/50 ${file ? 'border-green-400 bg-green-50/20' : 'border-indigo-200'}`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".srt,.txt"
          />
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${file ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'}`}>
            <i className={`fa-solid ${file ? 'fa-check' : 'fa-cloud-arrow-up'} text-2xl`}></i>
          </div>
          <p className="text-lg font-semibold text-gray-700">
            {file ? file.name : 'Click to upload SRT or TXT'}
          </p>
          {!file && <p className="text-sm text-gray-500 mt-1">Files up to 10MB recommended</p>}
        </div>

        {/* Configuration */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white/50 rounded-2xl">
          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-xl text-sm font-bold uppercase ${direction === TranslationDirection.EN_TO_FA ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              English
            </span>
            <button 
              onClick={toggleDirection}
              className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:rotate-180 transition-transform duration-300 text-indigo-600"
            >
              <i className="fa-solid fa-right-left"></i>
            </button>
            <span className={`px-4 py-2 rounded-xl text-sm font-bold uppercase ${direction === TranslationDirection.FA_TO_EN ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              Persian
            </span>
          </div>
          
          <p className="text-sm font-medium text-gray-500 italic">
            {direction === TranslationDirection.EN_TO_FA ? 'English → Persian' : 'Persian → English'}
          </p>
        </div>

        {/* Progress Bar */}
        {status.isTranslating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-semibold text-indigo-900">
              <span>Processing...</span>
              <span>{status.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full transition-all duration-300 ease-out" 
                style={{ width: `${status.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Error State */}
        {status.error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-start gap-3">
            <i className="fa-solid fa-circle-exclamation mt-1"></i>
            <p className="text-sm font-medium">{status.error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 gap-4 pt-4">
          {!status.result ? (
            <button
              onClick={handleTranslate}
              disabled={!file || status.isTranslating}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-lg active:scale-95 ${
                !file || status.isTranslating
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {status.isTranslating ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="fa-solid fa-spinner fa-spin"></i> Translating...
                </span>
              ) : (
                'Translate Now'
              )}
            </button>
          ) : (
            <button
              onClick={handleDownload}
              className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-download"></i> Download SRT
            </button>
          )}

          {status.result && (
            <button 
              onClick={() => setStatus({ ...status, result: null, progress: 0 })}
              className="text-gray-500 text-sm font-medium hover:text-indigo-600 transition-colors"
            >
              Translate another file
            </button>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-12 max-w-2xl text-center space-y-4 px-4">
        <h3 className="text-lg font-bold text-indigo-900">Why choose our translator?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Feature icon="fa-clock" title="Preserves Time" text="Keeps your SRT timing codes 100% intact." />
          <Feature icon="fa-wand-magic-sparkles" title="Context Aware" text="Smart translations that feel natural." />
          <Feature icon="fa-shield-halved" title="Secure" text="Private processing with zero data storage." />
        </div>
      </div>

      <footer className="mt-16 text-gray-400 text-xs">
        &copy; {new Date().getFullYear()} Subtitles Translator Pro. Created for perfection.
      </footer>
    </div>
  );
};

const Feature: React.FC<{ icon: string; title: string; text: string }> = ({ icon, title, text }) => (
  <div className="flex flex-col items-center">
    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600 mb-2">
      <i className={`fa-solid ${icon}`}></i>
    </div>
    <h4 className="font-bold text-gray-800 text-sm">{title}</h4>
    <p className="text-xs text-gray-500">{text}</p>
  </div>
);

export default App;
