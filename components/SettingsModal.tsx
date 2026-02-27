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

  const handleChange = (key: keyof AppSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleProviderChange = (provider: 'gemini' | 'openai') => {
    setLocalSettings(prev => ({ ...prev, provider }));
  };

  const handleEditModeChange = (editMode: 'atomic' | 'full') => {
    setLocalSettings(prev => ({ ...prev, editMode }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 border border-gray-100">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-white">
          <h2 className="text-lg font-bold text-gray-800">系统设置 (Settings)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* 1. Execution Mode (Top Level) */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-brand-500 rounded-full"></div>
               编辑模式 (Execution Mode)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleEditModeChange('atomic')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  localSettings.editMode === 'atomic'
                    ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                }`}
              >
                <div className="text-sm font-bold">原子化编辑</div>
                <div className="text-[10px] opacity-70">手动确认每个修改点</div>
              </button>
              <button
                onClick={() => handleEditModeChange('full')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  localSettings.editMode === 'full'
                    ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                }`}
              >
                <div className="text-sm font-bold">全文重写</div>
                <div className="text-[10px] opacity-70">直接生成并替换全文</div>
              </button>
            </div>

            {/* Iteration Control (Only for Full mode) */}
            {localSettings.editMode === 'full' && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">迭代次数 (Iterations)</label>
                  <span className="text-brand-600 font-bold text-sm">{localSettings.rewriteIterations || 1} 次</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  step="1"
                  value={localSettings.rewriteIterations || 1}
                  onChange={(e) => handleChange('rewriteIterations', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  多轮迭代将使专家深度审阅并持续优化文档，建议 2-3 次以平衡质量与速率限制。
                </p>
              </div>
            )}
          </section>

          {/* 2. Model Provider Selection */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-brand-500 rounded-full"></div>
               模型引擎 (Model Engine)
            </h3>
            
            <div className="flex border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50 p-1">
              <button
                onClick={() => handleProviderChange('gemini')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-all rounded-lg ${
                  localSettings.provider === 'gemini'
                    ? 'text-brand-600 bg-white shadow-sm ring-1 ring-black/5'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                }`}
              >
                <Sparkles size={14} className={localSettings.provider === 'gemini' ? "text-brand-500" : "text-gray-400"} />
                <span>Gemini</span>
              </button>
              <button
                onClick={() => handleProviderChange('openai')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-all rounded-lg ${
                  localSettings.provider === 'openai'
                    ? 'text-brand-600 bg-white shadow-sm ring-1 ring-black/5'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                }`}
              >
                <Server size={14} className={localSettings.provider === 'openai' ? "text-brand-500" : "text-gray-400"} />
                <span>自定义</span>
              </button>
            </div>

            <div className="pt-2">
              {localSettings.provider === 'gemini' ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">API Key</label>
                    <input
                      type="password"
                      value={localSettings.geminiApiKey}
                      onChange={(e) => handleChange('geminiApiKey', e.target.value)}
                      placeholder="留空则使用系统默认 Key"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Model Name</label>
                    <input
                      type="text"
                      value={localSettings.geminiModel}
                      onChange={(e) => handleChange('geminiModel', e.target.value)}
                      placeholder="gemini-3-flash-preview"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-mono text-gray-600"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Base URL</label>
                    <input
                      type="text"
                      value={localSettings.openaiBaseUrl}
                      onChange={(e) => handleChange('openaiBaseUrl', e.target.value)}
                      placeholder="https://api.openai.com/v1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-mono text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">API Key</label>
                    <input
                      type="password"
                      value={localSettings.openaiApiKey}
                      onChange={(e) => handleChange('openaiApiKey', e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Model Name</label>
                    <input
                      type="text"
                      value={localSettings.openaiModel}
                      onChange={(e) => handleChange('openaiModel', e.target.value)}
                      placeholder="gpt-4o"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-mono text-gray-600"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
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
