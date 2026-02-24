import React, { useState } from 'react';
import { PlanResponse } from '../types';
import { ShieldCheck, AlertTriangle, Target, BookOpen, Star, UserCheck, MessageSquareQuote, Terminal, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface Props {
  plan: PlanResponse;
}

// Helper component for a code block with copy button
const PromptBlock: React.FC<{ title: string; content: string }> = ({ title, content }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700 mt-2">
            <div className="flex justify-between items-center px-3 py-1.5 bg-slate-800 border-b border-slate-700">
                <span className="text-xs text-slate-400 font-mono font-bold uppercase">{title}</span>
                <button 
                    onClick={handleCopy} 
                    className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                >
                    {copied ? <Check size={12} className="text-green-400"/> : <Copy size={12}/>}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            <pre className="p-3 overflow-x-auto text-[10px] md:text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto custom-scrollbar">
                {content.trim()}
            </pre>
        </div>
    );
};

export const ExpertCritiqueCard: React.FC<Props> = ({ plan }) => {
  const { expertProfile, critique, thoughts, debugInfo } = plan;
  const [showPrompts, setShowPrompts] = useState(false);
  
  if (!expertProfile || !critique) return null;

  const scoreColor = critique.overallScore > 80 ? 'text-green-600' : critique.overallScore > 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden my-4 max-w-2xl">
      {/* Header: Expert Identity */}
      <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-100 text-brand-700 rounded-lg">
            <UserCheck size={20} />
          </div>
          <div>
            <div className="text-sm text-slate-500 font-medium">当前主理专家</div>
            <div className="font-bold text-slate-800 text-lg leading-tight">{expertProfile.title}</div>
            <div className="text-xs text-brand-600 font-mono mt-0.5">{expertProfile.competency}</div>
          </div>
        </div>
        <div className="text-right">
            <div className={`text-2xl font-black ${scoreColor}`}>{critique.overallScore}</div>
            <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">当前质量评分</div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        
        {/* Thoughts (Reasoning) */}
        {thoughts && (
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 text-amber-800 text-sm italic relative">
               <MessageSquareQuote size={16} className="absolute top-3 left-3 text-amber-400" />
               <div className="pl-6">
                 <span className="font-bold not-italic text-xs uppercase tracking-wide text-amber-600 block mb-1">AI 思考回路</span>
                 {thoughts}
               </div>
            </div>
        )}

        {/* Strategic Goal */}
        <div className="flex gap-3">
          <Target className="text-accent-500 shrink-0 mt-1" size={18} />
          <div>
            <h4 className="font-bold text-slate-800 text-sm mb-1">优化战略目标</h4>
            <p className="text-slate-600 text-sm leading-relaxed">{critique.strategicGoal}</p>
          </div>
        </div>

        {/* Missing Pillars */}
        {critique.missingPillars && critique.missingPillars.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                <h4 className="flex items-center gap-2 font-bold text-red-800 text-xs uppercase tracking-wide mb-2">
                    <AlertTriangle size={14} /> 缺失的关键知识点
                </h4>
                <ul className="list-disc list-inside space-y-1">
                    {critique.missingPillars.map((p, i) => (
                        <li key={i} className="text-red-700 text-sm">{p}</li>
                    ))}
                </ul>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="bg-green-50/50 p-3 rounded-lg">
                <h4 className="text-green-800 font-bold text-xs mb-2 flex items-center gap-1">
                    <ShieldCheck size={14} /> 现有优势
                </h4>
                <ul className="space-y-1">
                    {critique.strengths.map((s, i) => (
                        <li key={i} className="text-green-700 text-xs flex gap-1.5">
                            <span className="mt-1 w-1 h-1 bg-green-500 rounded-full shrink-0"></span>
                            {s}
                        </li>
                    ))}
                </ul>
            </div>
            
            {/* Weaknesses */}
            <div className="bg-orange-50/50 p-3 rounded-lg">
                <h4 className="text-orange-800 font-bold text-xs mb-2 flex items-center gap-1">
                    <BookOpen size={14} /> 待提升领域
                </h4>
                <ul className="space-y-1">
                    {critique.weaknesses.map((w, i) => (
                        <li key={i} className="text-orange-700 text-xs flex gap-1.5">
                            <span className="mt-1 w-1 h-1 bg-orange-400 rounded-full shrink-0"></span>
                            {w}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
      </div>

      {/* Debug / Prompt Info Section */}
      {debugInfo && (
        <div className="border-t border-slate-100">
            <button 
                onClick={() => setShowPrompts(!showPrompts)}
                className="w-full px-5 py-3 flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Terminal size={14} />
                    <span>查看 Agent 提示词详情 (Prompt Logs)</span>
                </div>
                {showPrompts ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {showPrompts && (
                <div className="px-5 pb-5 pt-1 space-y-4 bg-slate-50 animate-in slide-in-from-top-2">
                    <div>
                        <h5 className="text-xs font-bold text-slate-700 mb-1">Stage 1: Architect Agent (规划)</h5>
                        <PromptBlock title="System Prompt" content={debugInfo.plannerSystemPrompt} />
                        <PromptBlock title="User Prompt" content={debugInfo.plannerUserPrompt} />
                    </div>
                    <div>
                        <h5 className="text-xs font-bold text-slate-700 mb-1">Stage 2: Expert Editor Agent (执行)</h5>
                        <PromptBlock title="System Prompt (Dynamic)" content={debugInfo.editorSystemPrompt} />
                        <PromptBlock title="User Prompt" content={debugInfo.editorUserPrompt} />
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
};
