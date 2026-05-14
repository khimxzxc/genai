import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * CodeViewer - отображает файлы проекта в стиле GitHub
 */
export function CodeViewer({ files = [] }) {
  const [activeFileId, setActiveFileId] = useState(files.length > 0 ? files[0].id : null);

  if (!files || files.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center text-gray-500">
        Код файлдары табылмады.
      </div>
    );
  }

  const activeFile = files.find(f => f.id === activeFileId) || files[0];
  const lineCount = activeFile?.content?.split('\n').length || 0;
  
  const getLanguage = (fileName) => {
    if (!fileName) return 'text';
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith('.html')) return 'html';
    if (lowerName.endsWith('.css')) return 'css';
    if (lowerName.endsWith('.js')) return 'javascript';
    return 'text';
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col mb-10">
      {/* GitHub-style Header Tabs */}
      <div className="bg-[#f6f8fa] border-b border-gray-200 px-4 pt-3 flex gap-1 overflow-x-auto">
        {files.map((file) => (
          <button
            key={file.id}
            onClick={() => setActiveFileId(file.id)}
            className={`px-4 py-2 text-xs font-semibold rounded-t-md border-t border-x transition-all ${
              activeFileId === file.id
                ? 'bg-white border-gray-200 text-indigo-600 -mb-px z-10'
                : 'bg-transparent border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="opacity-70">{getLanguage(file.fileName) === 'html' ? '📄' : '🎨'}</span>
              {file.fileName}
            </span>
          </button>
        ))}
      </div>

      {/* File Info Bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-2.5 flex justify-between items-center text-[12px] text-gray-500">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-gray-700">
             <span className="text-gray-400">📁</span>
             {activeFile?.fileName}
          </div>
          <span className="text-gray-300">|</span>
          <span>{lineCount} жол</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600 font-mono text-[10px]">
            {getLanguage(activeFile?.fileName).toUpperCase()}
          </span>
          <button 
            onClick={() => navigator.clipboard.writeText(activeFile?.content)}
            className="hover:text-indigo-600 transition-colors flex items-center gap-1"
          >
            <span>📋</span> Көшіру
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div className="relative text-sm">
        <SyntaxHighlighter
          language={getLanguage(activeFile?.fileName)}
          style={vscDarkPlus}
          showLineNumbers={true}
          customStyle={{
            margin: 0,
            padding: '1.5rem',
            background: '#0d1117', // GitHub Dark Background
            fontSize: '13px',
            lineHeight: '1.6',
            maxHeight: '600px',
            borderRadius: '0 0 1rem 1rem'
          }}
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1.5em',
            color: '#484f58',
            textAlign: 'right',
            userSelect: 'none'
          }}
        >
          {activeFile ? activeFile.content : ''}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
