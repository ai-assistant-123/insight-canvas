import mammoth from 'mammoth';
import * as PdfJsDist from 'pdfjs-dist';

// 处理 PDF.js 在不同环境下的 ESM 导出结构兼容性
// 在 Vite/ESM 环境下，PdfJsDist 可能是一个包含 GlobalWorkerOptions 的对象，
// 也可能是一个包含 default 属性的对象。
const getPdfjsLib = () => {
  if ((PdfJsDist as any).GlobalWorkerOptions) {
    return PdfJsDist;
  }
  if ((PdfJsDist as any).default && (PdfJsDist as any).default.GlobalWorkerOptions) {
    return (PdfJsDist as any).default;
  }
  return PdfJsDist;
};

const pdfjsLib = getPdfjsLib();

// 配置 PDF.js worker
if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
  // 使用 jsdelivr 替代 esm.sh，因为 esm.sh 可能会对 worker 脚本进行 ESM 转换，导致 importScripts 失败
  // jsdelivr 提供的原始文件通常更适合作为 worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

export interface ImportedFile {
  mimeType: string;
  data: string; // 提取的文本（作为后备）或 HTML
  base64?: string; // 原始 PDF Base64（用于 Gemini 原生多模态）
  images?: string[]; // 渲染的页面图片数组（用于 OpenAI Vision）
}

/**
 * 原始文件导入服务
 * 根据文件类型分发处理策略：
 * - Word (.docx): 使用 Mammoth 转换为 HTML
 * - PDF (.pdf): 使用 PDF.js 提取文本，并渲染为图片（用于 AI 视觉识别）
 * - Markdown/Text: 直接读取文本
 */
export const importFileRaw = async (file: File): Promise<ImportedFile> => {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  try {
    if (fileName.endsWith('.docx') || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const html = await parseDocxToHtml(file);
      return { mimeType: 'text/html', data: html };
    } else if (fileName.endsWith('.pdf') || fileType === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      // 先转换为 Base64，此时 ArrayBuffer 肯定没被 detach
      const base64 = arrayBufferToBase64(arrayBuffer);
      
      // 加载 PDF 文档一次
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      // 从同一个 pdf 实例提取文本和图片
      const text = await extractTextFromPdf(pdf);
      const images = await renderPdfToImages(pdf); 
      
      return { 
        mimeType: 'application/pdf', 
        data: text, 
        base64: base64,
        images: images 
      };
    } else if (fileName.endsWith('.md') || fileName.endsWith('.txt') || fileName.endsWith('.markdown') || fileType.startsWith('text/')) {
       // 处理 Markdown 或纯文本
       const text = await file.text();
       return { mimeType: 'text/markdown', data: text };
    } else {
      throw new Error('不支持的文件格式。仅支持 Word (.docx), PDF (.pdf), Markdown (.md) 和 文本文件 (.txt)');
    }
  } catch (error) {
    console.error('File import error:', error);
    throw new Error(`文件读取失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// 使用 Mammoth.js 将 Docx 解析为 HTML
const parseDocxToHtml = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  if (result.messages && result.messages.length > 0) {
    console.warn('Mammoth messages:', result.messages);
  }
  return result.value;
};

// 将 PDF 页面渲染为 JPEG 图片流
// 用于发送给多模态大模型 (Gemini Vision / GPT-4o) 进行视觉理解
const renderPdfToImages = async (pdf: any): Promise<string[]> => {
  const images: string[] = [];
  const maxPages = 10; // 限制页数，防止 Payload 过大
  const numPages = Math.min(pdf.numPages, maxPages);

  // 创建离屏 Canvas
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) throw new Error("Could not create canvas context");

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 }); // 1.5倍缩放以提高 OCR 准确率

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    // 转换为 JPEG 格式以减小体积 (质量 0.8)
    const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
    images.push(imageUrl);
  }

  return images;
};

// 提取 PDF 纯文本 (作为后备)
const extractTextFromPdf = async (pdf: any): Promise<string> => {
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const strings = textContent.items.map((item: any) => item.str);
    fullText += strings.join(' ') + '\n\n';
  }
  
  return fullText.trim();
};
