/**
 * Компонент для отображения списка ошибок (violations/feedback) от ИИ.
 * Показывает конкретную строку кода студента (codeSnippet), где есть ошибка.
 */

const categoryConfig = {
  HTML: { icon: '🏗️', color: 'bg-blue-50 border-blue-200',     badge: 'bg-blue-100 text-blue-700' },
  CSS:  { icon: '🎨', color: 'bg-purple-50 border-purple-200', badge: 'bg-purple-100 text-purple-700' },
  UI:   { icon: '🖥️', color: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-700' },
};

const FeedbackCard = ({ item, index }) => {
  const config = categoryConfig[item.category] || categoryConfig.HTML;

  return (
    <div className={`rounded-xl border p-5 ${config.color} transition-all hover:shadow-md`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xl">{config.icon}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${config.badge}`}>
            {item.category}
          </span>
          {item.location && (
            <code className="text-xs bg-gray-700 text-gray-100 px-2 py-0.5 rounded">
              {item.location}
            </code>
          )}
        </div>
        <span className="text-gray-400 text-xs font-mono shrink-0">#{index + 1}</span>
      </div>

      {/* Issue */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">🔍 Қате</p>
        <p className="text-gray-800 text-sm leading-relaxed">{item.issue}</p>
        {/* Точная строка в файле */}
        {item.line && (
          <div className="text-xs text-gray-500 font-mono mt-1.5">
            📍 {item.line}
          </div>
        )}
      </div>

      {/* Строка кода студента с ошибкой */}
      {item.codeSnippet && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">⚠ Қате жол:</p>
          <pre className="text-xs bg-gray-900 text-red-300 rounded-lg px-3 py-2 overflow-x-auto font-mono whitespace-pre-wrap break-all">
            {item.codeSnippet}
          </pre>
        </div>
      )}

      {/* How to Fix */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">✅ Қалай жөндеу керек</p>
        <pre className="text-xs bg-gray-800 text-green-300 rounded-lg p-3 whitespace-pre-wrap font-mono overflow-x-auto">
          {item.howToFix}
        </pre>
      </div>

      {/* Study Materials */}
      {item.studyMaterials?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">📚 Оқуға ұсынылады</p>
          <ul className="space-y-1">
            {item.studyMaterials.map((mat, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-indigo-400 mt-0.5">→</span>
                <span>{mat}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export const ViolationsList = ({ feedback }) => {
  if (!feedback?.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <span className="text-4xl block mb-2">🎉</span>
        Қателер табылмады! Тамаша жұмыс.
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-700 mb-4">
        Менторлық кері байланыс
        <span className="ml-2 text-sm font-normal text-gray-400">({feedback.length} қате)</span>
      </h3>
      <div className="space-y-4">
        {feedback.map((item, i) => (
          <FeedbackCard key={i} item={item} index={i} />
        ))}
      </div>
    </div>
  );
};
