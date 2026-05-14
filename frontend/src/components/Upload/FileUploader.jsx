import { useState, useRef } from 'react';

/**
 * Компонент для загрузки файлов проекта (HTML, CSS, картинки).
 * Поддерживает drag-and-drop папок и выбор нескольких файлов.
 */
export const FileUploader = ({ onFilesSelected }) => {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  
  const folderInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Рекурсивный обход перетаскиваемых папок
  const traverseFileTree = (item, path = '') => {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file) => {
          // Добавляем кастомный путь, если он есть, иначе берем имя
          file.customPath = path + file.name;
          resolve([file]);
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        dirReader.readEntries(async (entries) => {
          let dirFiles = [];
          for (let i = 0; i < entries.length; i++) {
            dirFiles = dirFiles.concat(
              await traverseFileTree(entries[i], path + item.name + '/')
            );
          }
          resolve(dirFiles);
        });
      } else {
        resolve([]);
      }
    });
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragging(false);
    
    let newFiles = [];
    if (e.dataTransfer.items) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i].webkitGetAsEntry();
        if (item) {
          const extractedFiles = await traverseFileTree(item);
          newFiles = newFiles.concat(extractedFiles);
        }
      }
    } else {
      newFiles = Array.from(e.dataTransfer.files);
    }
    
    addFiles(newFiles);
  };

  const handleInputChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    selectedFiles.forEach(file => {
      // webkitRelativePath содержит путь при выборе через webkitdirectory
      file.customPath = file.webkitRelativePath || file.name;
    });
    addFiles(selectedFiles);
    // Сбрасываем value, чтобы можно было выбрать те же файлы снова
    e.target.value = '';
  };

  const addFiles = (newFiles) => {
    // Убираем скрытые файлы (например, .DS_Store)
    const validFiles = newFiles.filter(f => !f.name.startsWith('.'));
    setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (files.length === 0) {
      alert('Жоба файлдарын жүктеңіз!');
      return;
    }
    onFilesSelected(files);
  };

  // Проверка: есть ли хотя бы один HTML файл
  const hasHtml = files.some(f => f.name.toLowerCase().endsWith('.html'));

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
          dragging
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div className="text-4xl mb-3">📁</div>
        <p className="text-gray-700 font-medium mb-1">
          Жоба папкасын осында тасымалдаңыз
        </p>
        <p className="text-gray-400 text-sm mb-4">
          (HTML, CSS және суреттер)
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Папка таңдау
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Файлдар таңдау
          </button>
        </div>

        {/* Скрытые инпуты */}
        <input
          ref={folderInputRef}
          type="file"
          webkitdirectory="true"
          directory="true"
          className="hidden"
          onChange={handleInputChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      {files.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 max-h-48 overflow-y-auto">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Таңдалған файлдар ({files.length}):
          </p>
          <ul className="space-y-1">
            {files.map((file, idx) => (
              <li key={idx} className="flex justify-between items-center text-sm">
                <span className="text-gray-600 truncate mr-2" title={file.customPath}>
                  📄 {file.customPath}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                  <button 
                    onClick={() => removeFile(idx)}
                    className="text-red-400 hover:text-red-600 font-bold"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={files.length === 0 || !hasHtml}
        className="w-full py-3 px-6 rounded-xl font-semibold text-white transition-all duration-200
          bg-indigo-600 hover:bg-indigo-700 active:scale-95
          disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500"
      >
        {files.length === 0 
          ? 'Файлдарды жүктеңіз...' 
          : !hasHtml 
            ? 'Кем дегенде бір .html файл қажет!' 
            : '🚀 Анализ жасау'}
      </button>
    </div>
  );
};
