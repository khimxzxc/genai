import { useState, useEffect } from 'react';
import { useLocation, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { ScoreCard } from '../components/Results/ScoreCard';
import { ViolationsList } from '../components/Results/ViolationsList';
import { ScoreJustifications } from '../components/Results/ScoreJustifications';
import { LearningPath } from '../components/Results/LearningPath';
import { NextAttempt } from '../components/Results/NextAttempt';
import { CodeViewer } from '../components/Results/CodeViewer';
import { api } from '../lib/api';

/**
 * Нормализует данные из двух возможных источников:
 * 1) Свежий ответ API (есть scores)
 * 2) Сохранённый объект Evaluation из БД (поля camelCase)
 */
const normalizeResult = (data) => {
  if (!data) return null;
  
  // Если данные уже имеют структуру scores (из POST-ответа), 
  // убеждаемся, что файлы тоже проброшены
  if (data.scores) {
    return {
      ...data,
      files: data.files || []
    };
  }

  return {
    scores: {
      total: Number(data.totalScore) || 0,
      html:  Number(data.htmlScore)  || 0,
      css:   Number(data.cssScore)   || 0,
      ui:    Number(data.uiScore)    || 0,
    },
    grade:                       data.grade || '—',
    feedback:                    data.feedbackItems || [],
    scoreJustifications:         data.scoreJustifications || null,
    learningPathRecommendations: data.learningPathRecommendations || null,
    nextAttemptSuggestion:       data.nextAttemptSuggestion || null,
    screenshot:                  data.screenshot || null,
    files:                       data.files || [],
  };
};

export default function ResultPage() {
  const location     = useLocation();
  const navigate     = useNavigate();
  const [searchParams] = useSearchParams();

  const [result,  setResult]  = useState(normalizeResult(location.state?.result));
  const [loading, setLoading] = useState(!result);
  const [error,   setError]   = useState(null);

  const submissionId = searchParams.get('id');

  useEffect(() => {
    if (!result && submissionId) loadResult();
  }, [submissionId]);

  const loadResult = async () => {
    try {
      const data = await api.get(`/evaluate/${submissionId}`);
      if (data && !data.error) {
        // Если бағалау әлі жүріп жатса немесе кезекте тұрса
        if (data.status === 'processing' || data.status === 'pending') {
          setLoading(true);
          // Через 3 секунды пробуем еще раз
          setTimeout(loadResult, 3000);
          return;
        }
        setResult(normalizeResult(data));
      } else {
        setError(data?.error || 'Нәтижені жүктеу мүмкін болмады');
      }
    } catch {
      setError('Сервермен байланыс үзілді');
    } finally {
      if (loading) setLoading(false);
    }
  };

  /* ── Excel экспорт ────────────────────────────────── */
  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();

    // Лист 1: сводка
    const wsSummary = XLSX.utils.json_to_sheet([
      { Критерий: 'Жалпы ұпай',     Балл: result.scores.total, Максимум: 100 },
      { Критерий: 'HTML Құрылымы',   Балл: result.scores.html,  Максимум: 30  },
      { Критерий: 'CSS Сапасы',      Балл: result.scores.css,   Максимум: 30  },
      { Критерий: 'UI/UX Интерфейс', Балл: result.scores.ui,    Максимум: 40  },
      { Критерий: 'Баға',            Балл: result.grade,         Максимум: '-' },
    ]);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Нәтиже');

    // Лист 2: фидбек
    if (result.feedback?.length > 0) {
      const wsFeedback = XLSX.utils.json_to_sheet(
        result.feedback.map(f => ({
          Категория: f.category,
          Орын:      f.location,
          Қате:      f.issue,
          Жөндеу:    f.howToFix,
        }))
      );
      XLSX.utils.book_append_sheet(wb, wsFeedback, 'Кері байланыс');
    }

    // Лист 3: оқу жоспары
    if (result.learningPathRecommendations?.length > 0) {
      const wsPath = XLSX.utils.json_to_sheet(
        result.learningPathRecommendations.map(r => ({
          Тақырып:     r.topic,
          Маңыздылығы: r.importance,
          Себеп:       r.reason,
          Уақыт:       r.estimatedTime,
          Тапсырма:    r.practiceTask,
        }))
      );
      XLSX.utils.book_append_sheet(wb, wsPath, 'Оқу жоспары');
    }

    XLSX.writeFile(wb, 'CodeReview_Report.xlsx');
  };

  /* ── States ───────────────────────────────────────── */
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600" />
    </div>
  );

  if (error) return (
    <div className="text-center py-20">
      <p className="text-red-500 mb-4">{error}</p>
      <button onClick={() => navigate('/dashboard')} className="text-indigo-600 underline">
        Дашбордқа қайту
      </button>
    </div>
  );

  if (!result) return <Navigate to="/dashboard" replace />;

  const hasDetails = result.scoreJustifications || result.learningPathRecommendations || result.nextAttemptSuggestion;

  /* ── Render ───────────────────────────────────────── */
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Талдау нәтижесі</h1>
          <p className="text-gray-500 mt-1">Толық есеп және оқу бойынша ұсыныстар</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors text-sm"
          >
            ← Дашборд
          </button>
          <button
            onClick={downloadExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium shadow-lg shadow-green-100 text-sm"
          >
            📊 Excel
          </button>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ══ Left column (2/3) ══ */}
        <div className="lg:col-span-2 space-y-8">

          {/* 1. Общий балл */}
          <ScoreCard scores={result.scores} grade={result.grade} />

          {/* 2. Детальное обоснование баллов */}
          <ScoreJustifications scoreJustifications={result.scoreJustifications} />

          {/* Код студента */}
          {result.files && result.files.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>💻</span> Студент коды
              </h2>
              <CodeViewer files={result.files} />
            </div>
          )}

          {/* 3. Технические нарушения */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span>⚠️</span> Техникалық ескертулер
            </h2>
            <ViolationsList feedback={result.feedback} />
          </div>
        </div>

        {/* ══ Right column (1/3 sidebar) ══ */}
        <div className="space-y-6">

          {/* 4. Оқу жоспары */}
          <LearningPath recommendations={result.learningPathRecommendations} />

          {/* 5. Келесі қадам */}
          <NextAttempt suggestion={result.nextAttemptSuggestion} />

          {/* Fallback если нет ни одной детальной секции */}
          {!hasDetails && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-center text-sm text-yellow-700">
              <span className="text-2xl block mb-2">ℹ️</span>
              Толық нәтижені көру үшін жұмысты қайта тексеріңіз.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
