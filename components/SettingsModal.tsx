import React from 'react';
import { X, Save, Sparkles, Server } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = React.useState<AppSettings>(settings);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleChange = (key: keyof AppSettings, value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleProviderChange = (provider: 'gemini' | 'openai') => {
    setLocalSettings(prev => ({ ...prev, provider }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 border border-gray-100">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-white">
          <h2 className="text-lg font-bold text-gray-800">模型设置 (Settings)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          <button
            onClick={() => handleProviderChange('gemini')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all relative ${
              localSettings.provider === 'gemini'
                ? 'text-brand-600 bg-white shadow-sm z-10'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
            }`}
          >
            <Sparkles size={16} className={localSettings.provider === 'gemini' ? "text-brand-500" : "text-gray-400"} />
            <span>Google Gemini</span>
            {localSettings.provider === 'gemini' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />
            )}
          </button>
          <button
            onClick={() => handleProviderChange('openai')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all relative ${
              localSettings.provider === 'openai'
                ? 'text-brand-600 bg-white shadow-sm z-10'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
            }`}
          >
            <Server size={16} className={localSettings.provider === 'openai' ? "text-brand-500" : "text-gray-400"} />
            <span>OpenAI Compatible</span>
            {localSettings.provider === 'openai' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 min-h-[320px] bg-white">
          {localSettings.provider === 'gemini' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">API Key</label>
                <div className="relative">
                  <input
                    type="password"
                    value={localSettings.geminiApiKey}
                    onChange={(e) => handleChange('geminiApiKey', e.target.value)}
                    placeholder="留空则使用系统默认 Key"
                    className="w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Model Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={localSettings.geminiModel}
                    onChange={(e) => handleChange('geminiModel', e.target.value)}
                    placeholder="例如: gemini-3-flash-preview"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-mono text-gray-600"
                  />
                </div>
              </div>
              
              <div className="bg-brand-50 p-3 rounded-lg border border-brand-100">
                 <p className="text-xs text-brand-700 leading-relaxed">
                    Insight Canvas 已针对 Gemini 3 的长上下文和推理能力进行了深度优化。
                 </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">API Base URL</label>
                <input
                  type="text"
                  value={localSettings.openaiBaseUrl}
                  onChange={(e) => handleChange('openaiBaseUrl', e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-mono text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">API Key</label>
                <input
                  type="password"
                  value={localSettings.openaiApiKey}
                  onChange={(e) => handleChange('openaiApiKey', e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Model Name</label>
                <input
                  type="text"
                  value={localSettings.openaiModel}
                  onChange={(e) => handleChange('openaiModel', e.target.value)}
                  placeholder="gpt-4o"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-mono text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  支持 OpenAI, DeepSeek, Claude 等兼容接口。
                </p>
              </div>
            </div>
          )}
        </div>


        {/* Footer */}
        <div className="p-5 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button 
            onClick={() => onSave(localSettings)}
            className="flex items-center space-x-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg hover:bg-brand-700 active:scale-95 transition-all shadow-sm hover:shadow-md font-medium text-sm"
          >
            <Save size={18} />
            <span>保存配置</span>
          </button>
        </div>
      </div>
    </div>
  );
};
