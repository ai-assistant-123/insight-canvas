# Insight Canvas (洞见画布)

> **"Expert Vision" for your documents.** 
> 为你的文档开启专家天眼，通过双智能体协作实现文档的专业级升维与评审。

**Insight Canvas** 是一个基于 **React 19** 和 **Google Gemini 3** 构建的代理式（Agentic）文档智能协作空间。它不仅仅是一个 AI 润色工具，而是一个内置了**“专家外脑”系统**的创作环境。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-orange)

---

## 🧠 核心理念：认知升维 (Cognitive Uplift)

在传统的 AI 写作中，用户往往需要反复调试 Prompt 才能获得理想的专业度。**Insight Canvas** 改变了这一范式：

1.  **自动识别领域**：AI 自动分析你的文档，识别其所属的垂直领域（法律、医学、战略咨询、学术研究等）。
2.  **动态专家人设**：系统自动召唤该领域的“首席专家”进行审阅，拒绝通用的、平庸的 AI 回复。
3.  **降维打击式评审**：专家不仅修改错别字，更会从逻辑架构、行业术语、战略意图等维度对文档进行深度重构。

---

## 🏗️ 架构：双智能体协同 (Dual-Agent Workflow)

本项目在 `services/aiService.ts` 中实现了基于思维链 (CoT) 的两阶段智能体工作流：

### Stage 1: The Architect (架构师)
*   **职责**: 宏观战略规划与专家召唤。
*   **逻辑**: 分析用户意图，确定最适合的专家身份（如“资深并购律师”或“《Nature》审稿人”），并制定升维战略。
*   **严格执行**: 强化了错误处理机制。如果架构师阶段执行失败（如 API 响应异常、JSON 解析错误或关键字段缺失），系统将直接记录详细的错误日志并中断后续操作，确保不会在错误的蓝图上进行编辑。

### Stage 2: The Editor (执行者)
*   **职责**: 文本手术与细节落地。
*   **逻辑**: 注入 Stage 1 的专家人设，对文档进行原子化修改。
*   **输出**: 包含 `originalText` (原文) 和 `replacementText` (建议) 的任务列表，支持一键应用。

---

## 🛠️ 关键技术特性

### 1. 鲁棒性文本替换算法 (Robust Replace)
解决了 LLM 返回的原文与编辑器内容（因空格、换行或 Markdown 格式化）不完全匹配的痛点：
*   **多级匹配策略**: 精确匹配 -> 正则模糊匹配 -> 数学公式标准化匹配 -> 指纹定位匹配。
*   **数学公式兼容**: 自动处理 LaTeX (`\alpha`) 与 Unicode (`α`) 的差异。

### 2. 多模态文档解析 (Multimodal Ingestion)
*   **PDF 深度解析**: 使用 `pdfjs-dist` 渲染页面，结合 Gemini Vision 提取复杂排版、表格和公式。
*   **Word 原生转换**: 使用 `mammoth` 提取语义化 HTML 并转换为干净的 Markdown。

### 3. 沉浸式交互体验
*   **上下文菜单**: 选中文字即可触发润色、精简、解释等专家指令。
*   **实时渲染**: 完美支持 GFM Markdown、LaTeX 数学公式和代码高亮。
*   **任务看板**: 实时查看 AI 的思考过程（Thoughts）和待处理的专家建议。

### 4. 灵活的模型配置
*   **Gemini & OpenAI**: 支持最新的 Gemini 3 系列模型及所有 OpenAI 兼容接口（如 DeepSeek, Claude 等）。
*   **自定义模型名**: 支持手动输入任何模型名称，方便测试最新的预览版模型。
*   **超时保护**: 内置 45s 超时机制与自动重试逻辑，确保在网络波动时也能获得及时反馈。

---

## 📦 技术栈

| 模块 | 技术选型 |
| :--- | :--- |
| **前端框架** | React 19 + Vite + TypeScript |
| **样式库** | Tailwind CSS + Framer Motion |
| **AI SDK** | `@google/genai` |
| **Markdown** | `react-markdown` + `remark-gfm` + `rehype-katex` |
| **文档处理** | `mammoth`, `pdfjs-dist`, `docx`, `turndown` |

---

## 🚀 部署指南 (Deployment Guide)

### 1. 本地开发 (Local Development)
1.  **安装依赖**: `npm install`
2.  **启动服务**: `npm run dev`
    *   *注意：本地开发已内置 Express 代理服务器，可自动解决 MiniMax/OpenAI 等接口的 CORS 跨域问题。*

### 2. 部署到 Cloudflare (Cloudflare Pages)
由于浏览器存在跨域限制，直接部署静态页面无法调用部分 AI 接口。建议使用 **Cloudflare Pages + Functions** 方案：

#### 第一步：准备代码
1.  将代码推送到 GitHub 仓库。
2.  确保项目根目录下有 `functions/api/proxy.ts`（见下文）。

#### 第二步：在 Cloudflare 控制台操作
1.  登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2.  进入 **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**。
3.  选择你的 GitHub 仓库。
4.  **构建设置 (Build settings)**:
    *   **Framework preset**: `Vite`
    *   **Build command**: `npm run build`
    *   **Build output directory**: `dist`
5.  **环境变量 (Environment variables)**:
    *   添加 `NODE_VERSION`: `20` (推荐)。
6.  点击 **Save and Deploy**。

#### 第三步：配置 Pages Functions (处理跨域代理)
为了让生产环境也支持代理，你需要在 GitHub 仓库中创建 `/functions/api/proxy.ts` 文件：

\`\`\`typescript
// functions/api/proxy.ts
export const onRequestPost: PagesFunction = async (context) => {
  const { request } = context;
  const { url, method, headers, body } = await request.json() as any;

  try {
    const response = await fetch(url, {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
\`\`\`

*Cloudflare Pages 会自动识别 \`functions\` 目录并将其部署为 Serverless 接口。*

---

## 📄 导出功能
*   **Word (.docx)**: 一键将 Markdown 转换为原生 Word 文档，保留标题层级和表格。
*   **Markdown (.md)**: 导出标准 Markdown 源码。

---

## ⚖️ License
本项目采用 **MIT License**。
Copyright (c) 2026 **ai-assistant-123**。
