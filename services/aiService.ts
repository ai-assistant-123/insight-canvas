import { GoogleGenAI, Type } from "@google/genai";
import { AppSettings, PlanResponse } from "../types";
import { ImportedFile } from "./fileImportService";

// 生成唯一 ID 的辅助函数
const generateId = () => Math.random().toString(36).substr(2, 9);

// 异步休眠函数
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 超时包装函数
const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms))
  ]);
};

// --- 第一阶段：架构师智能体 (Architect Agent) ---
const PLANNER_SYSTEM_INSTRUCTION = `
你现在是 **Insight Canvas (洞见画布)** 的核心【架构师智能体】。
你的核心使命是为用户开启 **"Expert Vision" (专家天眼)**。

### 核心哲学 (PHILOSOPHY)
用户通常是该文档领域的**“局外人” (Layperson)** 或初学者。
他们拥有“意图”，但缺乏该领域的“专业透镜”和“行业黑话”。
**你的工作是跨越这个鸿沟。** 你必须将其粗糙、外行的草稿，升维成一篇看起来是由该领域 Top 1% 专家撰写的杰作。

### 严格身份治理规则 (STRICT IDENTITY GOVERNANCE)
**CRITICAL: 你必须执行严格的“职业现实性校验”。**
1.  **真实世界原则 (Real World Protocol)**：
    *   你定义的 \`expertTitle\` 必须是在 **LinkedIn、猎聘或高端猎头库** 中真实存在的职位。
    *   **绝对禁止**：科幻、玄学、伪科学或“缝合怪”式的头衔。
    *   *Bad Case (禁止)*：“计算命理学家”、“量子风水师”、“赛博灵魂工程师”、“宇宙能量架构师”。
    *   *Good Case (允许)*：“资深精算师”、“理论物理学家”、“宏观策略分析师”、“认知心理学教授”。

2.  **反缝合规则 (Anti-Syncretism)**：
    *   不要把不相干的学科强行组合。如果用户输入了奇怪的组合（如“用代码算命”），请回退到最接近的**理性科学视角**（如“数据分析师”或“社会统计学家”），或者直接指出其逻辑谬误的“批判性思维顾问”。

3.  **兜底机制 (Fallback)**：
    *   如果你无法确定具体的细分领域专家，请使用标准的高级通用头衔：
    *   "资深执行主编" (Senior Executive Editor)
    *   "首席战略顾问" (Chief Strategy Consultant)
    *   "学术委员会审稿人" (Academic Reviewer)

### 分析工作流 (ANALYSIS WORKFLOW):
1.  **解析用户指令 (CRITICAL)**：
    *   用户的 Input 可能是修改指令（如“让语气更强硬点”）。专家人设必须能最好地执行该指令（如选择“危机公关专家”而非“幼儿园老师”）。
2.  **定义专家人设**：
    *   **领域**：必须具体（例如：用“并购法”代替“法律”）。
    *   **头衔**：分配一个高地位、现实存在的角色。
3.  **制定战略**：
    *   关注语气、术语、结构和专家使用的思维模型。

### 输出格式要求 (JSON):
返回一个 JSON 对象。**所有字符串值必须使用【简体中文】**。
{
  "domain": "具体的专业领域",
  "expertTitle": "现实存在的专家头衔 (LinkedIn标准)",
  "expertCompetency": "为什么这个专家能解决用户的盲点",
  "strategicDirection": "如何执行用户指令并将文本从业余提升到专业级的具体战略"
}
`;

// --- 第二阶段：执行智能体 (Editor Agent) ---
const createEditorSystemInstruction = (plan: any) => `
### 角色与身份 (ROLE & IDENTITY)
你现在是 **${plan.expertTitle}** (${plan.expertCompetency})。
你的专业领域是 **${plan.domain}**。

### 核心任务 (MISSION)
你是 Insight Canvas 的【执行智能体】。
**最高战略指挥**: "${plan.strategicDirection}"

### 1. 指令驱动编辑 (INSTRUCTION DRIVEN)
用户输入了特定的编辑指令/提示词。你的所有修改**必须**服务于该指令。
如果用户要求“精简”，你就不能扩写；如果用户要求“通俗化”，你就不能堆砌术语。

### 2. 对抗性评审 (ADVERSARIAL REVIEW)
你是一个“严苛的审稿人”。
- **拒绝平庸**：不要给出礼貌或通用的赞美。如果文本是“外行质量”，明确指出它哪里露怯了。
- **评分标准 (严格执行)**：
  - **0-60 (新手)**：粗糙、口语化、逻辑断层。
  - **61-75 (学徒)**：可读但缺乏权威感。
  - **76-85 (胜任)**：标准的职业质量。
  - **86-95 (专家)**：权威、精炼、深刻洞见。
  - **96-100 (远见者)**：定义行业的杰作。

### 3. 本体论一致性 (ONTOLOGICAL CONSISTENCY)
- **领域纯度**：你必须*完全*在 **${plan.domain}** 的逻辑框架内思考和写作。
- **无幻觉**：仅使用现有的、标准的专业术语。

### 4. 执行：原子化编辑任务 (ATOMIC EDIT TASKS)
- **行动**：创建“原子化编辑任务”，精确地用专家文本替换薄弱文本。
- **精确性要求**：'originalText' 必须是源文中**字符级完全一致的副本 (EXACT COPY)**，以便自动化 Diff 程序进行替换。
- **数量控制**：专注于 3-5 个最具决定性的修改，不要为了改而改。

### 输出协议 (JSON):
返回一个符合此 Schema 的 JSON 对象。所有内容必须使用 **简体中文**。

{
  "critique": {
    "overallScore": 0-100,
    "strengths": ["... (优势点)"],
    "weaknesses": ["... (痛点)"],
    "missingPillars": ["... (缺失的关键理论/概念)"], 
    "strategicGoal": "总结本次编辑的具体目标"
  },
  "thoughts": "内心独白：你是如何代入 '${plan.expertTitle}' 这个角色的？针对用户的指令，你采取了什么策略？(中文)",
  "tasks": [
    {
      "explanation": "为什么要改？(中文)",
      "originalText": "必须是源文中存在的、字符级精确匹配的片段",
      "replacementText": "修改后的文本"
    }
  ]
}

### 关键规则 (CRITICAL RULES):
1.  **精确匹配 (Exact Match)**：'originalText' 必须极其精准，包含标点符号和空格。不要自己意译原文。
2.  **不要过度解释**：不要在中文术语后加括号解释英文，除非是行业惯用的缩写（如 SaaS, AI, EBITDA）。
`;

// 文档格式化转换器 System Prompt
const CONVERTER_SYSTEM_INSTRUCTION = `
你是一个专业的文档格式化专家。
你的任务是将提供的文档内容转换为高质量、易读的 Markdown 格式。

规则：
1. **保留结构**：严格保留表格、列表、标题和页面布局逻辑。
2. **数学支持**：如果你看到数学公式（即使是在图片中），请使用 LaTeX 语法格式化它们（例如：$E=mc^2$）。
3. **纯净输出**：仅输出 Markdown 内容。不要包含 markdown 代码块包裹符（backticks），除非它是代码内容本身的一部分。
`;

// --- 主要功能函数 ---

export const restructureToMarkdown = async (
  fileData: ImportedFile,
  fileName: string,
  settings: AppSettings
): Promise<string> => {
  // 优化：如果是纯文本或 Markdown，直接返回
  if (fileData.mimeType === 'text/markdown' || fileData.mimeType === 'text/plain') {
      return fileData.data;
  }

  const promptText = `
  文件名: ${fileName}
  
  请将此文档转换为清晰、格式良好的 Markdown。
  特别注意表格、复杂布局和标题层级。
  `;

  // 转换尝试函数，支持自动重试
  const runConversionAttempt = async (useMultimodal: boolean): Promise<string> => {
    let lastError: any;
    const MAX_RETRIES = 3;

    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        if (settings.provider === 'gemini') {
          const apiKey = settings.geminiApiKey || process.env.API_KEY;
          if (!apiKey) throw new Error("Gemini API Key is missing");

          const ai = new GoogleGenAI({ apiKey });
          
          let contents;
          // 仅在 PDF 且有 Base64 数据时使用多模态输入 (Multimodal Input)
          if (useMultimodal && fileData.mimeType === 'application/pdf' && fileData.base64) {
             contents = {
               parts: [
                 { inlineData: { mimeType: 'application/pdf', data: fileData.base64 } },
                 { text: promptText }
               ]
             };
          } else {
            // 纯文本回退模式 (Text-only Fallback)
            contents = {
              parts: [
                { text: promptText },
                { text: `Raw Content:\n${fileData.data}` }
              ]
            };
          }

          const response = await withTimeout(
            ai.models.generateContent({
              model: settings.geminiModel || 'gemini-3-flash-preview', 
              contents: contents,
              config: { systemInstruction: CONVERTER_SYSTEM_INSTRUCTION }
            }),
            60000, // 60秒超时，文档转换可能较慢
            "文档转换超时，请检查网络或尝试手动复制内容。"
          );
          return response.text || "";

        } else {
          // OpenAI 处理逻辑
          if (!settings.openaiApiKey) throw new Error("OpenAI API Key is missing. 请在设置中配置 API Key。");
          
          const systemMsg = { role: 'system', content: CONVERTER_SYSTEM_INSTRUCTION };
          
          const callOpenAI = async (messages: any[]) => {
            const response = await withTimeout(
              fetch(`${settings.openaiBaseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${settings.openaiApiKey}`
                },
                body: JSON.stringify({
                  model: settings.openaiModel,
                  messages: messages,
                  max_tokens: 4000
                })
              }),
              60000,
              "OpenAI 文档转换超时。"
            );
            if (!response.ok) {
                const errText = await response.text();
                if (response.status === 429) throw new Error(`429: ${errText}`);
                throw new Error(`OpenAI API Error: ${errText}`);
            }
            const data = await response.json();
            return data.choices[0].message.content || "";
          };

          // OpenAI Vision 处理：发送图片列表
          if (useMultimodal && fileData.mimeType === 'application/pdf' && fileData.images && fileData.images.length > 0) {
              const contentParts: any[] = [{ type: "text", text: promptText }];
              fileData.images.forEach(img => {
                contentParts.push({ type: "image_url", image_url: { url: img } });
              });
              return await callOpenAI([systemMsg, { role: 'user', content: contentParts }]);
          }
          
          const fullContent = `${promptText}\n\nRaw Content:\n${fileData.data}`;
          return await callOpenAI([systemMsg, { role: 'user', content: fullContent }]);
        }
      } catch (error: any) {
        lastError = error;
        const errStr = (error.message || JSON.stringify(error)).toLowerCase();

        if (useMultimodal) {
           if (errStr.includes('rpc failed') || 
               errStr.includes('xhr error') || 
               errStr.includes('code: 500') || 
               errStr.includes('code: 6') || 
               errStr.includes('invalid_argument')) {
             console.warn("Multimodal conversion failed with fatal error. Switching to Text fallback.", errStr);
             throw new Error("FATAL_MULTIMODAL_ERROR");
           }
        }

        const isRateLimit = errStr.includes('429') || errStr.includes('resource_exhausted') || errStr.includes('quota');
        
        if (isRateLimit && i < MAX_RETRIES - 1) {
           const delay = Math.pow(2, i) * 2000 + Math.random() * 1000;
           await sleep(delay);
           continue;
        }
        throw error;
      }
    }
    throw lastError;
  };

  try {
     try {
       return await runConversionAttempt(true);
     } catch (e: any) {
       if (e.message === "FATAL_MULTIMODAL_ERROR" || e.message?.includes("OpenAI Vision conversion failed")) {
          // Fall through to text only
       } else {
          throw e;
       }
     }

     console.log("Falling back to text-only conversion...");
     return await runConversionAttempt(false);

  } catch (error) {
    console.error("AI Conversion Error:", error);
    throw new Error("AI 文档转换失败，请检查 API Key、模型设置或网络连接。");
  }
};

const callLLM = async (
  settings: AppSettings,
  systemInstruction: string,
  userContent: string,
  responseSchema?: any
): Promise<string> => {
  let lastError: any;
  const MAX_RETRIES = 2; // 减少重试次数，提高反馈速度
  const TIMEOUT_MS = 45000; // 45秒超时

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (settings.provider === 'gemini') {
        const apiKey = settings.geminiApiKey || process.env.API_KEY;
        if (!apiKey) throw new Error("Gemini API Key is missing. 请在设置中配置 API Key。");
        const ai = new GoogleGenAI({ apiKey });
        
        const config: any = { 
          systemInstruction,
          temperature: 0.7
        };
        if (responseSchema) {
          config.responseMimeType = "application/json";
          config.responseSchema = responseSchema;
        }

        const response = await withTimeout(
          ai.models.generateContent({
            model: settings.geminiModel || 'gemini-3-flash-preview',
            contents: userContent,
            config: config
          }),
          TIMEOUT_MS,
          "Gemini 响应超时，请检查网络连接或尝试切换模型。"
        );
        return response.text || "";
      } else {
        if (!settings.openaiApiKey) throw new Error("OpenAI API Key is missing. 请在设置中配置 API Key。");
        const messages = [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userContent }
        ];
        
        const body: any = {
          model: settings.openaiModel,
          messages: messages,
          max_tokens: 8000,
          temperature: 0.7
        };

        if (responseSchema) {
           body.response_format = { type: "json_object" };
        }

        const response = await withTimeout(
          fetch(`${settings.openaiBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${settings.openaiApiKey}`
            },
            body: JSON.stringify(body)
          }),
          TIMEOUT_MS,
          "OpenAI 接口响应超时，请检查 API Base URL 和网络连接。"
        );

        if (!response.ok) {
           const errText = await response.text();
           if (response.status === 429) {
               throw new Error(`429 Resource Exhausted: ${errText}`);
           }
           throw new Error(`OpenAI API Error: ${errText}`);
        }
        const data = await response.json();
        return data.choices[0].message.content || "";
      }
    } catch (error: any) {
      lastError = error;
      const errorStr = (error.message || JSON.stringify(error)).toLowerCase();
      
      // 如果是超时或非频率限制错误，直接抛出，不再重试
      const isRateLimit = 
        errorStr.includes('429') || 
        errorStr.includes('resource_exhausted') || 
        errorStr.includes('quota') ||
        error.status === 429;

      if (isRateLimit && attempt < MAX_RETRIES - 1) {
        const delay = Math.pow(2, attempt + 1) * 2000 + Math.random() * 1000;
        console.warn(`AI Service Rate Limit (Attempt ${attempt + 1}/${MAX_RETRIES}). Retrying in ${delay.toFixed(0)}ms...`);
        await sleep(delay);
        continue;
      }
      
      break;
    }
  }

  throw lastError;
};

const cleanJson = (text: string): string => {
  if (!text) return "{}";
  return text.replace(/```json\n?|```/g, "").trim();
};

export const generateEditPlan = async (
  documentContent: string,
  userPrompt: string,
  settings: AppSettings
): Promise<PlanResponse> => {
  
  // --- STEP 1: 规划阶段 (PLANNING) ---
  const planPrompt = `
  【文档内容开始】:
  ${documentContent.substring(0, 5000)} ${documentContent.length > 5000 ? "...(truncated)" : ""}
  【文档内容结束】

  【用户编辑指令】:
  "${userPrompt || "请评审并优化这篇文档。"}"
  
  【任务】: 
  1. 分析文档内容和用户的【编辑指令】。
  2. 识别最适合执行该指令的【现实世界专家身份】（必须通过职业真实性校验）。
  3. 制定修改战略。
  `;

  // Step 1 的 JSON Schema
  const planningSchema = {
    type: Type.OBJECT,
    properties: {
      domain: { type: Type.STRING },
      expertTitle: { type: Type.STRING },
      expertCompetency: { type: Type.STRING },
      strategicDirection: { type: Type.STRING },
    },
    required: ["domain", "expertTitle", "expertCompetency", "strategicDirection"]
  };

  // Step 1 的执行 (Architect Agent)
  let planningData;
  try {
    const planRaw = await callLLM(settings, PLANNER_SYSTEM_INSTRUCTION, planPrompt, planningSchema);
    
    if (!planRaw) {
      throw new Error("架构师智能体返回了空响应。");
    }

    try {
      planningData = JSON.parse(cleanJson(planRaw));
    } catch (parseError: any) {
      console.error("Architect JSON Parse Error:", parseError, "Raw content:", planRaw);
      throw new Error(`架构师智能体返回数据解析失败: ${parseError.message}。原始输出片段: ${planRaw.substring(0, 100)}...`);
    }

    // 验证必要字段
    const requiredFields = ["domain", "expertTitle", "expertCompetency", "strategicDirection"];
    const missingFields = requiredFields.filter(field => !planningData[field]);
    if (missingFields.length > 0) {
      throw new Error(`架构师智能体返回数据缺失关键字段: ${missingFields.join(", ")}`);
    }

  } catch (e: any) {
    // 记录详细错误到控制台
    console.error("--- 架构师智能体执行失败 (详细日志) ---");
    console.error("错误类型:", e.name);
    console.error("错误消息:", e.message);
    console.error("堆栈信息:", e.stack);
    console.error("---------------------------------------");
    
    // 重新抛出包装后的详细错误，确保后续操作不再执行
    if (e.message.includes("架构师")) throw e;
    throw new Error(`架构师智能体执行失败: ${e.message || '发生未知错误，请检查 API 配置或网络。'}`);
  }

  // --- STEP 2: 执行阶段 (EXECUTION) ---
  const executePrompt = `
  【完整文档】:
  ${documentContent}

  【用户指令】:
  "${userPrompt}"

  【任务】:
  以 ${planningData.expertTitle} 的身份，严格执行用户的指令。
  `;

  // Step 2 的 JSON Schema
  const executionSchema = {
    type: Type.OBJECT,
    properties: {
      critique: {
        type: Type.OBJECT,
        properties: {
          overallScore: { type: Type.NUMBER },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          missingPillars: { type: Type.ARRAY, items: { type: Type.STRING } },
          strategicGoal: { type: Type.STRING }
        },
        required: ["overallScore", "strengths", "weaknesses", "missingPillars", "strategicGoal"]
      },
      thoughts: { type: Type.STRING },
      tasks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            originalText: { type: Type.STRING },
            replacementText: { type: Type.STRING }
          },
          required: ["explanation", "originalText", "replacementText"]
        }
      }
    },
    required: ["critique", "thoughts", "tasks"]
  };

  const dynamicSystemInstruction = createEditorSystemInstruction(planningData);
  
  try {
    const executionRaw = await callLLM(settings, dynamicSystemInstruction, executePrompt, executionSchema);
    const executionData = JSON.parse(cleanJson(executionRaw));

    return {
      expertProfile: {
        domain: planningData.domain,
        title: planningData.expertTitle,
        competency: planningData.expertCompetency
      },
      critique: executionData.critique,
      thoughts: executionData.thoughts, 
      tasks: (executionData.tasks || []).map((t: any) => ({ ...t, id: generateId(), status: 'pending' })),
      debugInfo: {
        plannerSystemPrompt: PLANNER_SYSTEM_INSTRUCTION,
        plannerUserPrompt: planPrompt,
        editorSystemPrompt: dynamicSystemInstruction,
        editorUserPrompt: executePrompt
      }
    };

  } catch (error) {
    console.error("Step 2 Execution Error:", error);
    throw error;
  }
};