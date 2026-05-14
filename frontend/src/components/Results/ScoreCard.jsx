/**
 * Компонент для отображения итогового балла (ScoreCard).
 * Показывает общий балл и разбивку по критериям HTML/CSS/UI.
 */
export const ScoreCard = ({ scores, grade }) => {
  if (!scores) return null;

  const getColor = (score, max) => {
    if (!max || isNaN(score)) return 'text-red-500';
    const pct = score / max;
    if (pct >= 0.8) return 'text-green-600';
    if (pct >= 0.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getBarColor = (score, max) => {
    if (!max || isNaN(score)) return 'bg-red-400';
    const pct = score / max;
    if (pct >= 0.8) return 'bg-green-500';
    if (pct >= 0.5) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  const criteria = [
    { label: 'HTML Құрылымы', score: scores.html || 0, max: 30 },
    { label: 'CSS Сапасы', score: scores.css || 0, max: 30 },
    { label: 'UI/UX Интерфейс', score: scores.ui || 0, max: 40 },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      {/* Общий балл */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Жалпы нәтиже</h2>
          <p className="text-gray-500 text-sm">{grade}</p>
        </div>
        <div className={`text-5xl font-black ${getColor(scores.total, 100)}`}>
          {scores.total}
          <span className="text-lg text-gray-400 font-normal">/100</span>
        </div>
      </div>

      {/* Круговой прогресс (упрощённый) */}
      <div className="w-full bg-gray-100 rounded-full h-3 mb-6">
        <div
          className={`h-3 rounded-full transition-all duration-700 ${getBarColor(scores.total, 100)}`}
          style={{ width: `${scores.total}%` }}
        />
      </div>

      {/* Разбивка по критериям */}
      <div className="space-y-4">
        {criteria.map(({ label, score, max }) => (
          <div key={label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">{label}</span>
              <span className={`font-semibold ${getColor(score, max)}`}>{score}/{max}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${getBarColor(score, max)}`}
                style={{ width: `${(score / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
