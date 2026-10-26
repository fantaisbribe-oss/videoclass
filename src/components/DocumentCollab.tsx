import React, { useState } from 'react';
import {
  FileText,
  Save,
  Download,
  Printer,
  Image as ImageIcon,
  Bold,
  Heading1,
  Heading2,
  List,
  CheckSquare,
  Code,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { UserRole } from '../types';

interface DocumentCollabProps {
  content: string;
  onContentChange: (newContent: string) => void;
  currentUserRole: UserRole;
  currentUserName: string;
  activeEditorName?: string;
}

export const DocumentCollab: React.FC<DocumentCollabProps> = ({
  content,
  onContentChange,
  currentUserRole,
  currentUserName,
  activeEditorName,
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');
  const [copied, setCopied] = useState<boolean>(false);

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('lesson-doc-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);

    onContentChange(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText ? selectedText.length : 4));
    }, 10);
  };

  const insertDiagram = () => {
    const diagramMarkdown = `\n\n![Wave Interference & Optics](/src/assets/images/diagram_physics_lesson_1793021698124.jpg)\n*Figure 14.1: Young's Double-Slit Geometric Fringe Analysis & Snell's Law.*\n\n`;
    onContentChange(content + diagramMarkdown);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cipherclass-lesson-notes-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  // Basic markdown parser for clean educational notes rendering
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      // Heading 1
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={index} className="text-2xl font-bold text-white mt-6 mb-3 pb-2 border-b border-slate-800">
            {line.replace('# ', '')}
          </h1>
        );
      }
      // Heading 2
      else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={index} className="text-lg font-semibold text-blue-300 mt-5 mb-2">
            {line.replace('## ', '')}
          </h2>
        );
      }
      // Heading 3
      else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={index} className="text-sm font-semibold text-slate-200 mt-4 mb-2">
            {line.replace('### ', '')}
          </h3>
        );
      }
      // Image
      else if (line.startsWith('![') && line.includes('](')) {
        const alt = line.substring(line.indexOf('[') + 1, line.indexOf(']'));
        const src = line.substring(line.indexOf('(') + 1, line.indexOf(')'));
        elements.push(
          <div key={index} className="my-4 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-lg">
            <img src={src} alt={alt} className="w-full object-cover max-h-80" referrerPolicy="no-referrer" />
          </div>
        );
      }
      // Math formula block
      else if (line.startsWith('$$') && line.endsWith('$$')) {
        elements.push(
          <div key={index} className="my-3 p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-cyan-300 text-center text-sm shadow-inner overflow-x-auto">
            {line.replace(/\$\$/g, '')}
          </div>
        );
      }
      // Checklist items
      else if (line.startsWith('- [x] ') || line.startsWith('- [ ] ')) {
        const isChecked = line.startsWith('- [x] ');
        const itemText = line.substring(6);
        elements.push(
          <div key={index} className="flex items-center gap-2.5 my-1 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={isChecked}
              readOnly
              className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
            />
            <span className={isChecked ? 'line-through text-slate-500' : ''}>{itemText}</span>
          </div>
        );
      }
      // Bullet list
      else if (line.startsWith('* ') || line.startsWith('- ')) {
        elements.push(
          <li key={index} className="ml-4 list-disc text-sm text-slate-300 my-1">
            {line.substring(2)}
          </li>
        );
      }
      // Empty line
      else if (line.trim() === '') {
        elements.push(<div key={index} className="h-2" />);
      }
      // Normal paragraph
      else {
        elements.push(
          <p key={index} className="text-sm text-slate-300 leading-relaxed my-1">
            {line}
          </p>
        );
      }
    });

    return elements;
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* Top Document Header & Formatting Toolbar */}
      <div className="flex items-center justify-between gap-4 px-6 py-3 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">
                Lecture Notes: Wave Optics & Quantum Theory
              </span>
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                E2EE Synced
              </span>
            </div>
            {activeEditorName && (
              <span className="text-[11px] text-slate-400">
                Active editor: <strong className="text-blue-300">{activeEditorName}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Toolbar formatting buttons */}
        <div className="hidden sm:flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => insertMarkdown('**', '**')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertMarkdown('## ')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
            title="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertMarkdown('* ')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
            title="Bullet list"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertMarkdown('- [ ] ')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
            title="Checklist task"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertMarkdown('$$ ', ' $$')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-mono"
            title="Math Formula"
          >
            $$
          </button>
          <button
            onClick={insertDiagram}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-blue-400 hover:bg-blue-950/60 border border-blue-800/40"
            title="Insert Physics Diagram"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Insert Diagram</span>
          </button>
        </div>

        {/* View Mode Controls & Export */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('editor')}
              className={`px-2.5 py-1 text-xs rounded-md ${
                viewMode === 'editor' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`hidden md:block px-2.5 py-1 text-xs rounded-md ${
                viewMode === 'split' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Split
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-2.5 py-1 text-xs rounded-md ${
                viewMode === 'preview' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Preview
            </button>
          </div>

          <button
            onClick={handleDownload}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Download Notes as Markdown"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrint}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Print or Export PDF"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor & Preview Split Panes */}
      <div className="flex-1 w-full h-full flex overflow-hidden">
        {/* Editor Pane */}
        {(viewMode === 'editor' || viewMode === 'split') && (
          <div className={`h-full flex flex-col ${viewMode === 'split' ? 'w-1/2 border-r border-slate-800' : 'w-full'} bg-slate-950`}>
            <div className="px-4 py-2 bg-slate-900/40 text-[11px] text-slate-500 font-mono flex items-center justify-between border-b border-slate-900">
              <span>MARKDOWN SOURCE</span>
              <span>AES-256 ENCRYPTED DELTAS</span>
            </div>
            <textarea
              id="lesson-doc-editor"
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="Start drafting classroom notes, formulas, or homework tasks..."
              className="flex-1 w-full p-6 bg-transparent text-slate-200 font-mono text-sm leading-relaxed outline-none resize-none selection:bg-blue-900 select-text"
            />
          </div>
        )}

        {/* Live Preview Pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`h-full overflow-y-auto ${viewMode === 'split' ? 'w-1/2' : 'w-full'} p-8 bg-slate-900/30 select-text`}>
            <div className="max-w-2xl mx-auto">{renderMarkdown(content)}</div>
          </div>
        )}
      </div>
    </div>
  );
};
