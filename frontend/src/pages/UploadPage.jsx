import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileUploader } from '../components/Upload/FileUploader';
import { uploadFiles, evaluateSubmission } from '../lib/api';

export default function UploadPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const classId = searchParams.get('classId');

  const handleFilesSelected = async (files) => {
    setLoading(true);
    setError('');
    try {
      // 1. Жүктеу
      const uploadResult = await uploadFiles(files, "Сіздің жұмысыңыз", null, classId);
      if (uploadResult.error) {
        throw new Error(uploadResult.error);
      }
      
      // 2. ИИ анализ
      const evalResult = await evaluateSubmission(uploadResult.submissionId);
      if (evalResult.error) {
         throw new Error(evalResult.error);
      }

      navigate('/result', { state: { result: evalResult } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Кодыңызды тексеріңіз</h1>
        <p className="text-gray-500">
          .html және .css файлдарыңызды жүктеңіз — ИИ W3C, BEM стандарттары бойынша бағалайды
        </p>
      </div>

      {/* Шаги */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-8">
        {['1. Файл жүктеу', '2. ИИ анализі', '3. Нәтиже'].map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            {i > 0 && <span>→</span>}
            <span className={i === 0 ? 'text-indigo-600 font-medium' : ''}>{step}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-spin">⚙️</div>
            <p className="text-gray-700 font-semibold text-lg">ИИ анализ жасауда...</p>
            <p className="text-gray-400 text-sm mt-2">Puppeteer скриншот жасап, Gemini 2.5 Flash бағалауда. Бұл 10-30 секунд алуы мүмкін.</p>
            <p className="text-red-400 text-xs mt-2 italic">* Ескерту: Жасанды интеллект қателесуі мүмкін, нәтижелерді тексеріңіз.</p>
          </div>
        ) : (
          <FileUploader onFilesSelected={handleFilesSelected} />
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            ❌ {error}
          </div>
        )}
      </div>

      {/* Информация о критериях */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { icon: '🏗️', title: 'HTML (30 б.)', desc: 'W3C семантика, WCAG 2.1, валидтілік' },
          { icon: '🎨', title: 'CSS (30 б.)', desc: 'BEM, Flexbox/Grid, DRY принципі' },
          { icon: '🖥️', title: 'UI/UX (40 б.)', desc: 'Контраст, отступ, композиция' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <p className="text-sm font-semibold text-gray-700">{title}</p>
            <p className="text-xs text-gray-400 mt-1">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
