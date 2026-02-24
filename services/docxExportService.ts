import * as docx from 'docx';
import { marked } from 'marked';

export const exportToDocx = async (markdown: string, filename: string) => {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle, Table, TableRow, TableCell, WidthType, ShadingType } = docx;

  // 1. Convert Markdown to HTML using marked
  const htmlContent = marked.parse(markdown, { async: false }) as string;

  // 2. Parse HTML string into DOM Nodes
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(`<body>${htmlContent}</body>`, 'text/html');
  const bodyNodes = Array.from(xmlDoc.body.childNodes);

  const docChildren: any[] = [];

  // Helper: Recursive function to process inline formatting (bold, italic, code)
  const processInlineNodes = (node: Node): docx.IRunOptions[] => {
    if (node.nodeType === Node.TEXT_NODE) {
      return [{ text: node.textContent || "" }];
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const childrenOptions = Array.from(el.childNodes).flatMap(processInlineNodes);

      // Apply styles based on tag
      return childrenOptions.map(options => {
        if (el.tagName === 'STRONG' || el.tagName === 'B') {
          return { ...options, bold: true };
        }
        if (el.tagName === 'EM' || el.tagName === 'I') {
          return { ...options, italics: true };
        }
        if (el.tagName === 'CODE') {
          return { 
            ...options, 
            font: "Courier New", 
            color: "E01E5A",
            shading: {
                type: ShadingType.CLEAR,
                fill: "F3F4F6",
            }
          };
        }
        if (el.tagName === 'U') {
          return { ...options, underline: {} };
        }
        return options;
      });
    }
    return [];
  };

  // Helper: Process block elements
  const processBlockNode = (node: Node): any | null => {
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const el = node as HTMLElement;
    const tagName = el.tagName;

    // --- HEADERS ---
    if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tagName)) {
      const level = HeadingLevel[`HEADING_${tagName.charAt(1)}` as keyof typeof HeadingLevel];
      const runs = processInlineNodes(node).map(opt => new TextRun(opt));
      return new Paragraph({
        heading: level,
        children: runs,
        spacing: { before: 240, after: 120 }
      });
    }

    // --- PARAGRAPH ---
    if (tagName === 'P') {
      const runs = processInlineNodes(node).map(opt => new TextRun(opt));
      return new Paragraph({
        children: runs,
        spacing: { after: 120 }
      });
    }

    // --- LISTS (UL/OL) ---
    if (tagName === 'UL' || tagName === 'OL') {
       const listItems = Array.from(el.children).filter(c => c.tagName === 'LI');
       const paragraphs: docx.Paragraph[] = [];
       
       listItems.forEach((li) => {
           // Handle content inside LI
           const runs = processInlineNodes(li).map(opt => new TextRun(opt));
           paragraphs.push(new Paragraph({
               children: runs,
               bullet: { level: 0 }, // Simple bullet
               spacing: { after: 50 }
           }));
       });
       return paragraphs; 
    }

    // --- BLOCKQUOTE ---
    if (tagName === 'BLOCKQUOTE') {
       const rawText = el.textContent || "";
       return new Paragraph({
           children: [new TextRun({ text: rawText, italics: true, color: "555555" })],
           indent: { left: 720 }, // Indent 0.5 inch
           border: { left: { color: "CCCCCC", space: 1, style: BorderStyle.SINGLE, size: 6 } },
           spacing: { after: 200 }
       });
    }

    // --- HORIZONTAL RULE (---) ---
    if (tagName === 'HR') {
       return new Paragraph({
            border: {
                bottom: {
                    color: "CCCCCC",
                    space: 1,
                    style: BorderStyle.SINGLE,
                    size: 6,
                },
            },
            spacing: { before: 120, after: 120 }
        });
    }

    // --- CODE BLOCK (PRE) ---
    if (tagName === 'PRE') {
        const codeEl = el.querySelector('code') || el;
        const text = codeEl.textContent || "";
        return new Paragraph({
            children: [new TextRun({ 
                text: text, 
                font: "Courier New",
                size: 20 // 10pt
            })],
            shading: {
                type: ShadingType.CLEAR,
                fill: "F5F7FA",
            },
            border: {
                top: { style: BorderStyle.SINGLE, size: 2, color: "DDDDDD" },
                bottom: { style: BorderStyle.SINGLE, size: 2, color: "DDDDDD" },
                left: { style: BorderStyle.SINGLE, size: 2, color: "DDDDDD" },
                right: { style: BorderStyle.SINGLE, size: 2, color: "DDDDDD" },
            },
            spacing: { after: 240 }
        });
    }

    // --- TABLE ---
    if (tagName === 'TABLE') {
        const rows: docx.TableRow[] = [];
        const trs = Array.from(el.querySelectorAll('tr'));
        
        trs.forEach((tr) => {
            const cells: docx.TableCell[] = [];
            const tds = Array.from(tr.querySelectorAll('td, th'));
            
            tds.forEach(td => {
                const isHeader = td.tagName === 'TH';
                // Process cell content
                const cellRuns = processInlineNodes(td).map(opt => new TextRun(opt));
                
                cells.push(new TableCell({
                    children: [new Paragraph({ children: cellRuns })],
                    shading: isHeader ? { fill: "F3F4F6", type: ShadingType.CLEAR } : undefined,
                    width: { size: 100, type: WidthType.AUTO },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 }
                }));
            });
            
            rows.push(new TableRow({ children: cells }));
        });

        return new Table({
            rows: rows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: docx.TableLayoutType.AUTOFIT,
        });
    }

    return null;
  };

  // Main Loop
  bodyNodes.forEach(node => {
      const result = processBlockNode(node);
      if (result) {
          if (Array.isArray(result)) {
              docChildren.push(...result);
          } else {
              docChildren.push(result);
          }
      }
  });

  // Fallback if empty
  if (docChildren.length === 0) {
      docChildren.push(new Paragraph({ text: markdown }));
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: docChildren,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};