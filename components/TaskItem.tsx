import React from 'react';
import { Check, X, Edit2, RefreshCcw, AlertTriangle, Wand2, MousePointerClick } from 'lucide-react';
import { EditTask, FixSuggestion } from '../types';

interface TaskItemProps {
  task: EditTask;
  onApply: (id: string) => void;
  onDiscard: (id: string) => void;
  onUpdate: (id: string, newReplacement: string) => void;
  onFix?: (id: string, suggestion: FixSuggestion) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onApply, onDiscard, onUpdate, onFix }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedText, setEditedText] = React.useState(task.replacementText);

  const handleSaveEdit = () => {
    onUpdate(task.id, editedText);
    setIsEditing(false);
  };

  if (task.status !== 'pending' && task.status !== 'failed') return null;

  return (
    <div className={`border rounded-lg p-3 mb-3 bg-white shadow-sm transition-all ${task.status === 'failed' ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-brand-300'}`}>
      
      <div className="flex justify-between items-start mb-2">
        <span className={`text-xs font-bold uppercase tracking-wider ${task.status === 'failed' ? 'text-red-600 flex items-center gap-1' : 'text-gray-500'}`}>
            {task.status === 'failed' ? <><AlertTriangle size={12}/> 匹配失败</> : '编辑任务'}
        </span>
      </div>

      <p className="text-sm text-gray-700 font-medium mb-2">{task.explanation}</p>

      {/* Failure Analysis Info */}
      {task.status === 'failed' && task.failureReason && (
          <div className="mb-2 p-2 bg-red-100/50 border border-red-200 rounded text-xs text-red-700 flex flex-col gap-2">
             <div className="flex items-start gap-2">
               <span className="font-bold shrink-0">分析:</span>
               <span>{task.failureReason}</span>
             </div>
             
             {/* Fix Suggestions Buttons */}
             {task.fixSuggestions && task.fixSuggestions.length > 0 && onFix && (
               <div className="flex flex-wrap gap-2 mt-1">
                 {task.fixSuggestions.map(suggestion => (
                   <button
                     key={suggestion.id}
                     onClick={() => onFix(task.id, suggestion)}
                     className="flex items-center gap-1.5 px-2 py-1 bg-white border border-red-200 hover:border-red-400 hover:text-red-600 text-red-500 rounded text-[11px] font-medium shadow-sm transition-colors"
                     title={suggestion.label}
                   >
                      {suggestion.type === 'replace_selection' ? <MousePointerClick size={12}/> : <Wand2 size={12}/>}
                      {suggestion.label}
                   </button>
                 ))}
               </div>
             )}
          </div>
      )}

      <div className="space-y-2 text-sm">
        <div className="bg-red-50 p-2 rounded text-red-700 line-through decoration-red-400/50 break-words font-mono text-xs opacity-75">
          {task.originalText}
        </div>
        
        {isEditing ? (
          <div className="flex flex-col space-y-2">
            <textarea 
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full p-2 border rounded text-xs font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
              rows={3}
            />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setIsEditing(false)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded" title="取消">
                  <X size={14} />
              </button>
              <button onClick={handleSaveEdit} className="p-1 bg-brand-600 text-white hover:bg-brand-700 rounded" title="保存">
                  <Check size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 p-2 rounded text-green-700 break-words font-mono text-xs relative group">
            {task.replacementText || <span className="italic opacity-50">(删除内容)</span>}
            <button 
              onClick={() => setIsEditing(true)}
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-white rounded shadow text-gray-500 hover:text-brand-600 transition-opacity"
            >
              <Edit2 size={12} />
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-2 mt-3 pt-2 border-t border-gray-100">
        <button 
          onClick={() => onDiscard(task.id)}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="忽略"
        >
          <X size={16} />
        </button>
        <button 
          onClick={() => onApply(task.id)}
          className={`p-1.5 text-white rounded shadow-sm transition-colors flex items-center gap-1 ${task.status === 'failed' ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-600 hover:bg-brand-700'}`}
          title={task.status === 'failed' ? '重试匹配' : '执行'}
        >
          {task.status === 'failed' ? <RefreshCcw size={16} /> : <Check size={16} />}
        </button>
      </div>
    </div>
  );
};