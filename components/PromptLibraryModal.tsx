import React from 'react';
import { X, Briefcase, Code2, Megaphone, Feather, MessageSquare } from 'lucide-react';

interface PromptLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (text: string) => void;
}

interface PromptTemplate {
  title: string;
  description: string;
  prompt: string;
}

interface PromptCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  templates: PromptTemplate[];
}

const CATEGORIES: PromptCategory[] = [
  {
    id: 'product',
    name: '产品与研发',
    icon: <Code2 size={18} />,
    color: 'text-blue-600 bg-blue-50 border-blue-100',
    templates: [
      {
        title: '标准化 PRD',
        description: '将草稿转化为标准产品需求文档',
        prompt: '请将这段内容重写为一份标准的产品需求文档 (PRD)。结构要求：1. 背景与目标 (Context)；2. 用户故事 (User Stories)；3. 功能详细说明 (Functional Specs)；4. 核心指标 (Success Metrics)。请使用专业的各种术语，确保逻辑严密。'
      },
      {
        title: 'MoSCoW 优先级',
        description: '基于 MoSCoW 法则进行需求分级',
        prompt: '请运用 MoSCoW 法则（Must have, Should have, Could have, Won\'t have）对这些需求进行优先级排序。请识别出哪些是必须上线的核心 MVP 功能，哪些是可以延期的锦上添花功能，并简述理由。'
      },
      {
        title: '边缘情况 (Corner Cases)',
        description: '挖掘逻辑漏洞与异常流程',
        prompt: '请扮演一位极其挑剔的 QA 工程师，寻找这段产品逻辑中的“边缘情况” (Corner Cases) 和潜在漏洞。不要关注正常流程，请列出至少 5 种可能导致系统出错的异常场景（如网络中断、并发操作、极端数据输入等）。'
      },
      {
        title: '创意发散 (Brainstorming)',
        description: '运用 SCAMPER 法则挖掘创新点',
        prompt: '请作为一名创新顾问，对这段产品内容进行头脑风暴。运用 SCAMPER 法则（替代、合并、改造、调整、改变用途、消除、反向）提出 5 个突破性的扩展功能或创意，旨在大幅提升产品竞争力和用户惊喜度。'
      },
      {
        title: '文档结构重构',
        description: '优化信息层级与可读性',
        prompt: '请对这段内容进行结构化重构，使其更符合阅读逻辑。要求：1. 使用清晰的 H1/H2/H3 标题层级；2. 将长难句拆解为 Bullet Points 列表；3. 遵循“金字塔原理”，结论先行；4. 统一专业术语的使用。'
      }
    ]
  },
  {
    id: 'business',
    name: '商务与管理',
    icon: <Briefcase size={18} />,
    color: 'text-slate-600 bg-slate-50 border-slate-100',
    templates: [
      {
        title: 'SWOT 交叉分析',
        description: '不仅分析现状，更制定交叉战略',
        prompt: '请不仅列出 SWOT（优势、劣势、机会、威胁），更要进行深度的 TOWS 交叉分析：1. SO 战略（依靠内部优势抓住外部机会）；2. WO 战略（利用外部机会扭转内部劣势）；3. ST 战略（利用优势对抗威胁）；4. WT 战略（防御性撤退）。'
      },
      {
        title: '第一性原理',
        description: '打破惯性，回归事物本质',
        prompt: '请运用“第一性原理” (First Principles) 重新审视这个问题。忽略所有的“行业惯例”和“类比”，将问题拆解为最基本的物理事实或公理，然后从这些基本事实出发，推导出一个可能具有颠覆性的创新解决方案。'
      },
      {
        title: '六顶思考帽',
        description: '全员模拟，多维度决策评估',
        prompt: '请依次戴上“六顶思考帽”对该方案进行全面模拟评审：1. 白帽（纯数据事实）；2. 红帽（直觉与情感）；3. 黑帽（风险与批判）；4. 黄帽（价值与利益）；5. 绿帽（创造性替代方案）；6. 蓝帽（总结与控制）。'
      },
      {
        title: '事前验尸 (Pre-mortem)',
        description: '假设失败，倒推原因',
        prompt: '请运用“逆向思维”进行事前验尸 (Pre-mortem Analysis)。假设现在是项目启动一年后，项目已经“彻底失败”了。请以“事后诸葛亮”的视角，详细复盘导致失败的 5 个最致命的根本原因，并针对性地提出现在的预防措施。'
      },
      {
        title: '投资人 Pitch',
        description: '针对 VC 的高强度路演逻辑',
        prompt: '请将这段内容改写为面向风险投资人 (VC) 的 Pitch Script。去除所有客套话，直击核心：1. 巨大的市场痛点；2. 我们独特的 unfair advantage；3. 商业模式与变现逻辑；4. 退出路径。语气要自信、紧迫且极具诱惑力。'
      }
    ]
  },
  {
    id: 'marketing',
    name: '营销与创作',
    icon: <Megaphone size={18} />,
    color: 'text-orange-600 bg-orange-50 border-orange-100',
    templates: [
      {
        title: 'PAS 痛点模型',
        description: '适用于解决具体问题的产品',
        prompt: '请使用 PAS (Problem-Agitation-Solution) 框架重写文案。适用场景：用户有明确痛点。1. Problem：精准描述用户当下的痛苦；2. Agitation：煽动这种痛苦，强调不解决的严重后果；3. Solution：展示我们的产品是唯一的解药。'
      },
      {
        title: 'AIDA 转化模型',
        description: '适用于落地页或广告转化',
        prompt: '请使用 AIDA (Attention-Interest-Desire-Action) 模型优化这段推广内容。适用场景：引导用户点击或购买。1. 吸引注意（惊人标题）；2. 激发兴趣（数据或案例）；3. 刺激欲望（核心利益）；4. 促成行动（明确 CTA）。'
      },
      {
        title: 'FAB 价值模型',
        description: '适用于产品详情或规格介绍',
        prompt: '请使用 FAB (Feature-Advantage-Benefit) 法则改写产品介绍。适用场景：用户需要了解细节。不要只堆砌参数 (Feature)，要说明它比竞品好在哪里 (Advantage)，最终转化为给用户带来的实际好处 (Benefit)。'
      },
      {
        title: '黄金圈法则',
        description: '适用于品牌愿景与故事传播',
        prompt: '请运用“黄金圈法则” (Why-How-What) 升维这段品牌介绍。适用场景：建立情感共鸣。不要从“我们做什么”开始，要从“我们相信什么” (Why) 开始，阐述我们的信念，最后再带出产品，激发用户的认同感。'
      },
      {
        title: '病毒式社媒贴',
        description: '适用于小红书/TikTok 等平台',
        prompt: '请将内容改写为极具网感的“病毒式”社媒文案。适用场景：追求流量与互动。要求：1. 标题必须是“标题党”风格；2. 正文多用 Emoji，口吻亲切真实；3. 结尾设置互动钩子 (Hook)，诱导评论；4. 加上热门 Hashtag。'
      }
    ]
  }
];

export const PromptLibraryModal: React.FC<PromptLibraryModalProps> = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden transform transition-all scale-100 border border-gray-100">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-100 text-brand-600 rounded-lg">
                <Feather size={20} />
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-800">指令模版库</h2>
                <p className="text-xs text-gray-500">选择一个专家场景，快速启动文档优化</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CATEGORIES.map((category) => (
              <div key={category.id} className="space-y-3 md:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2 mb-2 sticky top-0 bg-gray-50/95 py-2 z-10 backdrop-blur-sm">
                   <div className={`p-1.5 rounded-md ${category.color} bg-opacity-20`}>
                      {category.icon}
                   </div>
                   <h3 className="font-bold text-sm text-gray-700">{category.name}</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                    {category.templates.map((template, idx) => (
                        <button
                            key={idx}
                            onClick={() => onSelect(template.prompt)}
                            className="group flex flex-col items-start p-3 bg-white border border-gray-200 hover:border-brand-300 hover:shadow-md rounded-lg transition-all duration-200 text-left w-full relative overflow-hidden h-full"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex justify-between w-full mb-1">
                                <span className="font-semibold text-gray-800 text-sm group-hover:text-brand-700 transition-colors line-clamp-1">{template.title}</span>
                                <MessageSquare size={14} className="text-gray-300 group-hover:text-brand-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 shrink-0 ml-2" />
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{template.description}</p>
                        </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white text-xs text-center text-gray-400 shrink-0">
           提示：点击卡片将自动填充到输入框，您可以再进行微调。
        </div>

      </div>
    </div>
  );
};
