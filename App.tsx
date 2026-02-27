import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, Send, Bot, FileText, CheckCheck, Trash2, Loader2, Sparkles, Eye, Edit3, RotateCcw, Upload, Wand2, Type, Eraser, PenTool, Download, BookOpen, FileCode, ChevronDown, LayoutTemplate } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { AppSettings, ChatMessage, EditTask, PlanResponse, FixSuggestion } from './types';
import { generateEditPlan, restructureToMarkdown } from './services/aiService';
import { importFileRaw } from './services/fileImportService';
import { exportToDocx } from './services/docxExportService';
import { SettingsModal } from './components/SettingsModal';
import { TaskItem } from './components/TaskItem';
import { ExpertCritiqueCard } from './components/ExpertCritiqueCard';
import { PromptLibraryModal } from './components/PromptLibraryModal';

// 初始演示内容
const INITIAL_CONTENT = `# Insight Canvas (洞见画布)

欢迎使用 **Insight Canvas** —— 为你的文档开启专家天眼。

这里的核心理念是**“认知升维”**。也许你并非法律、医学或商业领域的顶级专家，但通过 AI 的协助，你可以创作出达到行业一流水准的文档。

## 🚀 开启“专家天眼”的三种方式：

1. **导入“毛坯”草稿**：上传你的草稿（Word/PDF/文本），AI 会自动分析其所属领域，并见证一位“虚拟首席专家”来审阅。
2. **选中即改**：在左侧画布中选中任意一段“外行”文字，点击“✨”图标，观察它如何被转化为“内行”表达。
3. **右侧深度评审**：在右侧对话框输入“请评审”，AI 将从结构、逻辑、术语等维度进行降维打击式的优化。

---

*试着选中这句话，让 AI 用“资深麦肯锡顾问”的口吻重写它？*
`;

const DEFAULT_SETTINGS: AppSettings = {
  provider: 'gemini',
  editMode: 'atomic',
  rewriteIterations: 1,
  geminiApiKey: '',
  geminiModel: 'gemini-3-flash-preview',
  openaiBaseUrl: '',
  openaiApiKey: '',
  openaiModel: '',
};


// LaTeX 与 Unicode 符号映射表，用于数学公式的模糊匹配
const MATH_EQUIVALENTS = [
    ['\\\\alpha', 'α'],
    ['\\\\beta', 'β'],
    ['\\\\gamma', 'γ'],
    ['\\\\delta', 'δ'],
    ['\\\\epsilon', 'ε'],
    ['\\\\zeta', 'ζ'],
    ['\\\\eta', 'η'],
    ['\\\\theta', 'θ'],
    ['\\\\iota', 'ι'],
    ['\\\\kappa', 'κ'],
    ['\\\\lambda', 'λ'],
    ['\\\\mu', 'μ'],
    ['\\\\nu', 'ν'],
    ['\\\\xi', 'ξ'],
    ['\\\\pi', 'π'],
    ['\\\\rho', 'ρ'],
    ['\\\\sigma', 'σ'],
    ['\\\\tau', 'τ'],
    ['\\\\upsilon', 'υ'],
    ['\\\\phi', 'φ'],
    ['\\\\chi', 'χ'],
    ['\\\\psi', 'ψ'],
    ['\\\\omega', 'ω'],
    ['\\\\Delta', 'Δ'],
    ['\\\\Sigma', 'Σ'],
    ['\\\\Omega', 'Ω'],
    ['\\\\times', '×'],
    ['\\\\cdot', '·'],
    ['\\\\leq', '≤'],
    ['\\\\geq', '≥'],
    ['\\\\neq', '≠'],
    ['\\\\approx', '≈'],
    ['\\\\infty', '∞'],
    ['\\\\pm', '±'],
    ['\\\\bmod', 'mod'],
    ['\\\\pmod', 'mod'],
    ['\\\\to', '→'],
    ['\\\\rightarrow', '→'],
    ['\\\\leftarrow', '←'],
];

/**
 * 鲁棒性文本替换算法 (Robust Replace Algorithm)
 * 解决 AI 返回的引用文本 (Original Text) 与编辑器实际文本不完全匹配的问题。
 * 这是一个核心稳定性功能，因为 LLM 经常会微调空格或格式。
 * 
 * 策略优先级：
 * 1. 精确匹配 (Exact Match): 最快且最安全。
 * 2. 忽略空白符的正则匹配 (Regex Whitespace Match): 处理空格/制表符/换行符的差异。
 * 3. 数学公式模糊匹配 (Flexible Math Match): 专门处理 LaTeX/Unicode 差异 (如 \sigma vs σ)。
 * 4. 指纹定位匹配 (Anchor Match / Fingerprinting): 忽略所有格式定位，处理 Markdown 格式化字符干扰的情况。
 */
const robustReplace = (content: string, original: string, replacement: string): string | null => {
  if (!original || !content) return null;

  // 1. Exact Match (Fastest & Safest)
  if (content.includes(original)) {
    return content.replace(original, replacement);
  }

  // 2. Relaxed Whitespace Match (Regex)
  // Handles differences in spaces/tabs/newlines
  try {
    const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexPattern = escaped.replace(/\s+/g, '\\s+');
    const regex = new RegExp(regexPattern);
    if (regex.test(content)) return content.replace(regex, replacement);
  } catch (e) { console.warn("Regex replace failed", e); }

  // 3. Flexible Math Match (New)
  // Handles LaTeX vs Unicode differences (e.g. \sigma vs σ, $...$ vs ...)
  try {
      let pattern = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex
      pattern = pattern.replace(/\s+/g, '\\s+'); // Flexible whitespace

      // Make $ optional around math terms
      pattern = pattern.replace(/\\\$/g, '\\$?'); 

      // Substitute Greek/Math symbols and common Latex/Text variations
      MATH_EQUIVALENTS.forEach(([latex, unicode]) => {
          const group = `(?:${latex}|${unicode})`;
          pattern = pattern.split(latex).join(group);
          // Only split by unicode if it's not a common subset of the latex command to avoid double replacement issues, 
          // but here our list is safe.
          pattern = pattern.split(unicode).join(group);
      });

      const regex = new RegExp(pattern);
      if (regex.test(content)) return content.replace(regex, replacement);
  } catch (e) { console.warn("Math regex replace failed", e); }

  // 4. Anchor Match (Fingerprinting)
  // Ignores ALL whitespace to find the text location. 
  // Crucial for when AI messes up indentation or Markdown formatting characters.
  const normalize = (str: string) => str.replace(/\s+/g, '');
  const cleanContent = normalize(content);
  const cleanOriginal = normalize(original);

  const cleanIdx = cleanContent.indexOf(cleanOriginal);
  
  if (cleanIdx !== -1) {
      // Map the "clean" index back to the "original" content index
      let currentCleanIdx = 0;
      let startIdx = -1;
      let endIdx = -1;

      for (let i = 0; i < content.length; i++) {
          if (!/\s/.test(content[i])) {
              // Found the start character
              if (currentCleanIdx === cleanIdx) startIdx = i;
              
              // Found the end character
              if (currentCleanIdx === cleanIdx + cleanOriginal.length - 1) {
                  endIdx = i + 1; // +1 to include the character
                  break;
              }
              currentCleanIdx++;
          }
      }

      if (startIdx !== -1 && endIdx !== -1) {
          return content.substring(0, startIdx) + replacement + content.substring(endIdx);
      }
  }

  return null;
};

/**
 * 查找最佳模糊匹配索引 (Best Effort Fuzzy Match)
 * 用于在完全匹配失败后，通过忽略所有非字母数字字符(aggressive normalization)来寻找潜在的匹配位置。
 */
const findBestFuzzyIndices = (content: string, original: string): [number, number] | null => {
    // 1. 激进标准化匹配 (忽略所有符号和Markdown，只保留字母数字汉字)
    const normalize = (str: string) => str.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
    const cleanContent = normalize(content);
    const cleanOriginal = normalize(original);

    if (cleanOriginal.length === 0) return null;
    
    const cleanIdx = cleanContent.indexOf(cleanOriginal);
    
    if (cleanIdx !== -1) {
         // Map back to original indices
         let currentCleanIdx = 0;
         let startIdx = -1;
         let endIdx = -1;
 
         for (let i = 0; i < content.length; i++) {
             // 只有当字符是标准化集的一部分时才计数
             if (/[^\p{L}\p{N}]/gu.test(content[i]) === false) {
                 if (currentCleanIdx === cleanIdx) startIdx = i;
                 if (currentCleanIdx === cleanIdx + cleanOriginal.length - 1) {
                     endIdx = i + 1;
                     break;
                 }
                 currentCleanIdx++;
             }
         }
         if (startIdx !== -1 && endIdx !== -1) return [startIdx, endIdx];
    }
    
    // 2. 尝试首尾匹配 (Head & Tail Match) - 应对中间内容被微调的情况
    if (original.length > 20) {
        const head = original.substring(0, 10);
        const tail = original.substring(original.length - 10);
        
        const startIdx = content.indexOf(head);
        if (startIdx !== -1) {
            // 从 startIdx 之后找 tail
            const tailSearchArea = content.substring(startIdx);
            const relativeTailIdx = tailSearchArea.indexOf(tail);
            if (relativeTailIdx !== -1) {
                const endIdx = startIdx + relativeTailIdx + tail.length;
                // 确保匹配长度合理 (不超过原文的2倍，防止匹配到两个相距甚远的段落)
                if ((endIdx - startIdx) < original.length * 2) {
                     return [startIdx, endIdx];
                }
            }
        }
    }

    return null;
};

/**
 * 诊断匹配失败并生成修复建议
 */
const diagnoseFailure = (content: string, original: string): { reason: string, suggestions: FixSuggestion[] } => {
  const suggestions: FixSuggestion[] = [];
  
  // 始终提供手动选择修复选项
  suggestions.push({
      id: 'manual',
      type: 'replace_selection',
      label: '替换当前选中的文本'
  });

  if (!original) return { reason: "AI 未提供原文引用", suggestions };
  if (!content) return { reason: "文档内容为空", suggestions };

  // 尝试寻找模糊匹配
  const fuzzyIndices = findBestFuzzyIndices(content, original);
  
  if (fuzzyIndices) {
      suggestions.unshift({
          id: 'fuzzy',
          type: 'force_replace_range',
          label: '强制替换 (忽略格式差异)',
          indices: fuzzyIndices
      });
      return { reason: "检测到格式或符号差异", suggestions };
  }

  const normalize = (str: string) => str.replace(/\s+/g, '').toLowerCase();
  const cleanContent = normalize(content);
  const cleanOriginal = normalize(original);

  // 1. 检查是否存在但被格式化符号干扰 (Markdown Symbols)
  const stripMarkdown = (str: string) => str.replace(/[*_#`~>\[\]\(\)\-]/g, '');
  if (stripMarkdown(cleanContent).includes(stripMarkdown(cleanOriginal))) {
    // 这种情况通常会被 findBestFuzzyIndices 捕获，但作为 fallback
    return { reason: "Markdown 格式符号不匹配", suggestions };
  }

  // 2. 检查前缀匹配
  const halfLen = Math.floor(cleanOriginal.length / 2);
  const firstHalf = cleanOriginal.substring(0, halfLen);
  if (cleanContent.includes(firstHalf)) {
    return { reason: "后半部分内容不匹配 (AI 可能修改了引用)", suggestions };
  }

  // 3. 检查后缀匹配
  const secondHalf = cleanOriginal.substring(halfLen);
  if (cleanContent.includes(secondHalf)) {
    return { reason: "前半部分内容不匹配 (AI 可能修改了引用)", suggestions };
  }

  return { reason: "完全未找到原文，可能已被修改或 AI 产生了幻觉", suggestions };
};

// 辅助函数：从 Markdown 提取标题 (第一个 H1)
const extractTitleFromMarkdown = (content: string, fallback: string): string => {
  if (!content) return fallback;
  // Look for the first line starting with # (H1)
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match && h1Match[1]) {
    return h1Match[1].trim().substring(0, 60); // Use H1, limit length
  }
  return fallback;
};

const App: React.FC = () => {
  // --- 状态管理 (State Management) ---
  const [docTitle, setDocTitle] = useState(() => extractTitleFromMarkdown(INITIAL_CONTENT, 'Untitled Document'));
  const [content, setContent] = useState(INITIAL_CONTENT);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    role: 'assistant',
    content: '你好！我是 Insight Canvas (洞见画布)。\n\n我不是普通的编辑器，而是你的“外脑”。无论你输入什么，我都能帮你匹配该领域最顶级的专家视角，将“外行”的草稿升维成“专家”的杰作。请告诉我你想写什么？',
    timestamp: Date.now()
  }]);
  const [input, setInput] = useState('');
  const [tasks, setTasks] = useState<EditTask[]>([]); // 存储 AI 生成的编辑任务
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPromptLibraryOpen, setIsPromptLibraryOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  
  // 选择状态 (Selection State): 用于处理悬浮上下文菜单
  const [selection, setSelection] = useState<{text: string, x: number, y: number} | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, tasks]);

  // 处理文本选择事件
  const handleSelect = () => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start !== end) {
        const text = textarea.value.substring(start, end);
        setSelection({ text, x: 0, y: 0 }); 
    } else {
        setSelection(null);
    }
  };

  // 处理悬浮菜单的操作 (润色、精简、解释、提问)
  const handleContextAction = (action: string) => {
    if (!selection) return;
    
    let prompt = "";
    switch(action) {
        case 'polish': prompt = `请用领域专家的口吻润色这段文字，使其更加专业、精准：\n"${selection.text}"`; break;
        case 'shorten': prompt = `请保留核心洞见，精简这段文字：\n"${selection.text}"`; break;
        case 'explain': prompt = `请以专家的视角解释这段文字背后的深层含义或潜台词：\n"${selection.text}"`; break;
        case 'custom': prompt = `关于这段文字 "${selection.text}"：`; break;
    }

    if (action === 'custom') {
        setInput(prompt);
        inputRef.current?.focus();
    } else {
        handleSend(false, prompt);
    }
    
    // Clear selection UI after action (optional, maybe user wants to keep it)
    // setSelection(null); 
  };

  // 发送消息处理函数 (核心逻辑入口)
  const handleSend = async (isAutoReview = false, overrideInput?: string) => {
    const textToSend = overrideInput || input.trim();
    if (isLoading) return;

    // Set default prompt if input is empty
    const userPrompt = textToSend || "请扮演该领域的顶级专家，开启‘专家天眼’，对本文档进行深度评审，并将其提升至行业出版级水准。";

    const userMsg: ChatMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: textToSend || "👁️ 开启专家天眼评审...", 
      timestamp: Date.now() 
    };
    
    setMessages(prev => [...prev, userMsg]);
    
    if (!overrideInput) {
      setInput('');
    }
    
    setIsLoading(true);

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      let currentContent = content;
      let finalPlan: PlanResponse | null = null;
      const iterations = settings.editMode === 'full' ? (settings.rewriteIterations || 1) : 1;

      for (let i = 0; i < iterations; i++) {
        const plan: PlanResponse = await generateEditPlan(currentContent, userPrompt, settings);
        finalPlan = plan;

        if (settings.editMode === 'full') {
          const fullTask = plan.tasks.find(t => t.originalText === 'FULL_DOCUMENT');
          if (fullTask) {
            currentContent = fullTask.replacementText;
            setContent(currentContent);
            // Mark as applied
            fullTask.status = 'applied';
          }
        } else {
          break;
        }

        // Rate limit protection
        if (i < iterations - 1) {
          await sleep(2000);
        }
      }

      if (finalPlan) {
        setTasks(finalPlan.tasks);

        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: settings.editMode === 'full' 
            ? `专家视界已开启。主理专家 [${finalPlan.expertProfile.title}] 已完成 ${iterations} 轮全文升维优化。`
            : `专家视界已开启。主理专家 [${finalPlan.expertProfile.title}] 已生成 ${finalPlan.tasks.length} 个升维建议。`,
          timestamp: Date.now(),
          expertPlan: finalPlan // 将 Plan 数据传递给消息卡片组件进行渲染
        };
        setMessages(prev => [...prev, aiMsg]);
      }

    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Insight Canvas 响应异常: ${error.message || '未知错误'}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // 文件导入处理 (File Import)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    
    const filenameBase = file.name.replace(/\.[^/.]+$/, "");
    setDocTitle(filenameBase);

    const loadingMsgId = Date.now().toString();
    setMessages(prev => [...prev, {
        id: loadingMsgId,
        role: 'assistant',
        content: `正在将 "${file.name}" 导入洞见画布...`,
        timestamp: Date.now()
    }]);

    try {
      // 1. 读取原生文件内容
      const importedFile = await importFileRaw(file);
      // 2. 调用 AI 进行结构化转换 (Restructure to Markdown)
      const markdown = await restructureToMarkdown(importedFile, file.name, settings);
      setContent(markdown);
      
      setDocTitle(extractTitleFromMarkdown(markdown, filenameBase));
      
      const successMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: `"${file.name}" 导入成功。随时可以召唤专家进行优化。`, timestamp: Date.now() };
      setMessages(prev => prev.map(m => m.id === loadingMsgId ? successMsg : m));
    } catch (error: any) {
      const errorMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: `导入失败: ${error.message}`, timestamp: Date.now() };
      setMessages(prev => prev.filter(m => m.id !== loadingMsgId).concat(errorMsg));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getSafeFilename = () => (docTitle || 'document').replace(/[^a-z0-9\u4e00-\u9fa5\-_]/gi, '_');

  // 导出 Markdown
  const handleExportMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${getSafeFilename()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 导出 Word
  const handleExportDocx = () => {
    exportToDocx(content, getSafeFilename());
  };

  // 应用单个编辑任务
  const applyTask = useCallback((taskId: string) => {
    setTasks(prevTasks => {
      const taskIndex = prevTasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return prevTasks;
      const task = prevTasks[taskIndex];
      // 使用鲁棒替换算法
      const newContent = robustReplace(content, task.originalText, task.replacementText);
      const updatedTasks = [...prevTasks];
      if (newContent !== null) {
        setContent(newContent);
        updatedTasks[taskIndex] = { ...task, status: 'applied', failureReason: undefined, fixSuggestions: undefined };
      } else {
        // 诊断并提供建议
        const { reason, suggestions } = diagnoseFailure(content, task.originalText);
        updatedTasks[taskIndex] = { ...task, status: 'failed', failureReason: reason, fixSuggestions: suggestions };
      }
      return updatedTasks;
    });
  }, [content]);

  // 处理修复操作 (手动选择替换 或 模糊替换)
  const handleFixTask = useCallback((taskId: string, suggestion: FixSuggestion) => {
    setTasks(prevTasks => {
      const taskIndex = prevTasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return prevTasks;
      const task = prevTasks[taskIndex];
      const updatedTasks = [...prevTasks];

      let newContent = content;
      let success = false;

      if (suggestion.type === 'replace_selection') {
         // 获取编辑器当前的选区
         const textarea = editorRef.current;
         if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
             const start = textarea.selectionStart;
             const end = textarea.selectionEnd;
             newContent = content.substring(0, start) + task.replacementText + content.substring(end);
             success = true;
         } else {
             alert("请先在编辑器中选中需要替换的文本片段。");
             return prevTasks;
         }
      } else if (suggestion.type === 'force_replace_range' && suggestion.indices) {
         const [start, end] = suggestion.indices;
         if (start >= 0 && end <= content.length) {
             newContent = content.substring(0, start) + task.replacementText + content.substring(end);
             success = true;
         }
      }

      if (success) {
          setContent(newContent);
          updatedTasks[taskIndex] = { ...task, status: 'applied', failureReason: undefined, fixSuggestions: undefined };
      }

      return updatedTasks;
    });
  }, [content]);

  const discardTask = (id: string) => setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'rejected' } : t));
  const updateTask = (id: string, newReplacement: string) => setTasks(prev => prev.map(t => t.id === id ? { ...t, replacementText: newReplacement } : t));
  
  // 批量应用所有任务
  const applyAllPending = () => {
    let tempContent = content;
    const pending = tasks.filter(t => t.status === 'pending');
    const updatedTasks = [...tasks];
    
    pending.forEach(task => {
      // NOTE: We must use the latest tempContent for each subsequent replacement
      const newContent = robustReplace(tempContent, task.originalText, task.replacementText);
      const idx = updatedTasks.findIndex(t => t.id === task.id);
      
      if (newContent !== null) { 
        tempContent = newContent; 
        if (idx !== -1) {
            updatedTasks[idx].status = 'applied'; 
            updatedTasks[idx].failureReason = undefined;
            updatedTasks[idx].fixSuggestions = undefined;
        }
      } else { 
        // 即使在批量模式下，也分析失败原因
        const { reason, suggestions } = diagnoseFailure(tempContent, task.originalText);
        if (idx !== -1) {
            updatedTasks[idx].status = 'failed'; 
            updatedTasks[idx].failureReason = reason;
            updatedTasks[idx].fixSuggestions = suggestions;
        }
      }
    });
    
    setContent(tempContent);
    setTasks(updatedTasks);
  };
  
  const clearCompleted = () => setTasks(prev => prev.filter(t => t.status === 'pending' || t.status === 'failed'));
  const pendingCount = tasks.filter(t => t.status === 'pending').length;

  return (
    <div className="flex h-full flex-col md:flex-row bg-[#f3f4f6] font-sans">
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onSave={(s) => { setSettings(s); setIsSettingsOpen(false); }} />
      
      <PromptLibraryModal 
        isOpen={isPromptLibraryOpen} 
        onClose={() => setIsPromptLibraryOpen(false)} 
        onSelect={(text) => {
            setInput(text);
            setIsPromptLibraryOpen(false);
            inputRef.current?.focus();
        }}
      />

      {/* LEFT: Canvas Editor Area (左侧编辑器区域) */}
      <div className="flex-1 flex flex-col h-1/2 md:h-full relative z-0">
        
        {/* Top Bar - Refined White Theme */}
        <div className="h-16 flex items-center justify-between px-6 bg-white border-b border-gray-100 shadow-sm z-10 relative shrink-0">
          {/* Left: Title & Stats */}
          <div className="flex items-center gap-4">
             <div className="p-2 bg-brand-50 text-brand-600 rounded-lg shadow-sm">
                <FileText size={20} />
             </div>
             <div className="flex flex-col">
                <input 
                  type="text" 
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="text-slate-800 font-bold text-lg bg-transparent border-none p-0 focus:ring-0 placeholder-slate-300 w-[150px] md:w-[300px] truncate hover:bg-gray-50/50 rounded transition-colors"
                  placeholder="未命名文档"
                />
                <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
                    <span>{content.length} 字</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span>{isLoading ? 'AI 思考中...' : '已就绪'}</span>
                </div>
             </div>
          </div>

          {/* Right: Tools (No Text Labels as requested) */}
          <div className="flex items-center gap-4">
             
             {/* File Operations Group (Pill Shape) */}
             <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1">
                
                {/* Import Button */}
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".docx,.pdf,.md,.txt" className="hidden" />
                <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white hover:shadow-sm rounded-md transition-all disabled:opacity-50 group"
                    disabled={isImporting}
                    title="导入文档 (Word, PDF, MD)"
                >
                    {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} className="text-slate-500 group-hover:text-brand-600 transition-colors"/>}
                </button>

                {/* Divider */}
                <div className="w-px h-4 bg-slate-300 mx-1"></div>

                {/* Export Dropdown */}
                <div className="relative">
                    <button 
                        onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} 
                        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all group ${isExportMenuOpen ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white hover:shadow-sm'}`}
                        title="导出文档"
                    >
                        <Download size={16} className={`${isExportMenuOpen ? 'text-brand-600' : 'text-slate-500 group-hover:text-brand-600'} transition-colors`} />
                        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180 text-brand-600' : ''}`}/>
                    </button>

                    {/* Animated Dropdown Menu */}
                    {isExportMenuOpen && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-1 flex flex-col animate-in fade-in zoom-in-95 origin-top-right">
                         <button onClick={() => {handleExportMarkdown(); setIsExportMenuOpen(false);}} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-600 rounded-lg transition-colors group">
                           <FileCode size={16} className="text-slate-400 group-hover:text-brand-600"/> <span>Markdown (.md)</span>
                         </button>
                         <button onClick={() => {handleExportDocx(); setIsExportMenuOpen(false);}} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors group">
                           <FileText size={16} className="text-slate-400 group-hover:text-blue-600"/> <span>Word (.docx)</span>
                         </button>
                      </div>
                    )}
                    {isExportMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)}></div>}
                </div>
             </div>

             {/* View Mode Toggle (Segmented Control) */}
             <div className="bg-slate-100 p-1 rounded-lg flex items-center relative border border-slate-200/50">
                <button 
                    onClick={() => setViewMode('edit')} 
                    title="编辑模式"
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'edit' ? 'bg-white text-brand-700 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                    <Edit3 size={16} />
                </button>
                <button 
                    onClick={() => setViewMode('preview')} 
                    title="预览模式"
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'preview' ? 'bg-white text-brand-700 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                    <Eye size={16} />
                </button>
             </div>
          </div>
        </div>

        {/* Editor Area (Fixed Height with Internal Scroll) */}
        <div className="flex-1 overflow-hidden p-4 md:p-8 bg-[#f3f4f6] relative flex flex-col">
           {/* Paper Container (纸张容器) - Fills available space, creates fixed card */}
           <div className="w-full max-w-3xl mx-auto h-full bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden relative flex flex-col transition-all">
              
              {viewMode === 'edit' ? (
                <textarea
                  ref={editorRef}
                  className="flex-1 w-full h-full p-10 resize-none focus:outline-none text-slate-800 leading-loose text-base font-sans selection:bg-brand-100 selection:text-brand-900 overflow-y-auto custom-scrollbar"
                  value={content}
                  onChange={(e) => { setContent(e.target.value); handleSelect(); }}
                  onSelect={handleSelect}
                  onMouseUp={handleSelect} // Capture mouse selection
                  spellCheck={false}
                  placeholder="开始写作..."
                />
              ) : (
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    <article className="prose prose-slate prose-lg max-w-none">
                       <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{content}</ReactMarkdown>
                    </article>
                </div>
              )}

              {/* Floating Action Menu (Context Aware) 悬浮操作栏 */}
              {selection && viewMode === 'edit' && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900 text-white p-1.5 rounded-full shadow-xl animate-in fade-in slide-in-from-bottom-2 z-20">
                      <div className="px-3 text-xs font-medium text-slate-300 border-r border-slate-700 max-w-[150px] truncate mr-1">
                        {selection.text}
                      </div>
                      <button onClick={() => handleContextAction('polish')} className="p-2 hover:bg-slate-700 rounded-full text-purple-300 hover:text-white transition-colors" title="专家润色">
                         <Wand2 size={16} />
                      </button>
                      <button onClick={() => handleContextAction('shorten')} className="p-2 hover:bg-slate-700 rounded-full text-blue-300 hover:text-white transition-colors" title="精简去冗">
                         <Eraser size={16} />
                      </button>
                      <button onClick={() => handleContextAction('explain')} className="p-2 hover:bg-slate-700 rounded-full text-yellow-300 hover:text-white transition-colors" title="深度解释">
                         <BookOpen size={16} /> 
                      </button>
                      <button onClick={() => handleContextAction('custom')} className="p-2 hover:bg-slate-700 rounded-full text-green-300 hover:text-white transition-colors" title="提问">
                         <PenTool size={16} />
                      </button>
                  </div>
              )}
           </div>
        </div>
      </div>

      {/* RIGHT: Agent Sidebar (右侧智能体工作区) */}
      <div className="w-full md:w-[400px] lg:w-[450px] flex flex-col h-1/2 md:h-full bg-white border-l border-gray-200 z-10 shadow-lg md:shadow-none">
        
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 bg-white shrink-0">
           <div className="flex items-center gap-2 font-bold text-slate-800">
              <div className="bg-brand-600 text-white p-1.5 rounded-lg">
                <Sparkles size={16}/>
              </div>
              <span className="text-lg tracking-tight">Insight Canvas</span>
           </div>
           <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors" title="设置">
              <Settings size={20} />
           </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth bg-white">
           {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col group ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
               <div className={`flex items-center gap-2 max-w-[90%] ${msg.role === 'user' ? 'flex-row' : 'flex-row'}`}>
                   {msg.role === 'user' && (
                       <button 
                         onClick={() => handleSend(false, msg.content)}
                         className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-brand-600 hover:bg-slate-100 rounded-full transition-all shrink-0"
                         title="再次执行此指令"
                         disabled={isLoading}
                       >
                          <RotateCcw size={14} />
                       </button>
                   )}
                   
                   <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                       msg.role === 'user' ? 'bg-brand-600 text-white rounded-br-none' : 'bg-slate-50 text-slate-700 border border-slate-100 rounded-bl-none'
                   }`}>
                      {msg.content}
                   </div>
               </div>
               {msg.expertPlan && <div className="w-full mt-2"><ExpertCritiqueCard plan={msg.expertPlan} /></div>}
            </div>
           ))}
           {isLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-400 px-2">
                 <Loader2 size={16} className="animate-spin text-brand-500"/>
                 <span>正在连接领域专家...</span>
              </div>
           )}
           <div ref={messagesEndRef} />
        </div>

        {/* Tasks (Sticky Bottom) - 任务列表 */}
        {tasks.some(t => t.status === 'pending' || t.status === 'failed') && (
           <div className="border-t border-gray-100 bg-slate-50/50 max-h-[250px] overflow-y-auto flex flex-col">
              <div className="sticky top-0 bg-white/80 backdrop-blur z-10 px-4 py-2 flex justify-between items-center border-b border-gray-100">
                 <span className="text-xs font-bold text-slate-500 uppercase">专家建议 ({pendingCount})</span>
                 {pendingCount > 0 && (
                     <button onClick={applyAllPending} className="p-1.5 bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors" title="全部应用">
                        <CheckCheck size={14} />
                     </button>
                 )}
              </div>
              <div className="p-2 space-y-2">
                 {tasks.filter(t => t.status === 'pending' || t.status === 'failed').map(t => (
                    <TaskItem 
                       key={t.id} 
                       task={t} 
                       onApply={applyTask} 
                       onDiscard={discardTask} 
                       onUpdate={updateTask}
                       onFix={handleFixTask}
                    />
                 ))}
                 {pendingCount === 0 && <div className="text-center py-4 text-slate-400 text-xs">暂无待处理建议</div>}
              </div>
           </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-100 bg-white shrink-0 flex gap-2 items-end">
           <button 
             onClick={() => setIsPromptLibraryOpen(true)}
             className="mb-1 p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors group relative"
             title="指令模版库"
           >
              <LayoutTemplate size={20} />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-brand-500 rounded-full animate-pulse"></div>
           </button>
           <div className="relative flex-1">
              <input 
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="告诉 AI 你想如何提升文档..."
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:bg-white transition-all text-sm"
                disabled={isLoading}
              />
              <button onClick={() => handleSend()} disabled={isLoading} className="absolute right-2 top-2 p-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
                 <Send size={16} />
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default App;