/**
 * Блок "Келесі қадам" — рекомендации для следующей попытки.
 * Показывает на чём сосредоточиться и ожидаемый прирост баллов.
 */
export const NextAttempt = ({ suggestion }) => {
  if (!suggestion) return null;
  const changes = suggestion.changes || [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
        <span>🚀</span> Келесі қадам
      </h3>

      {/* Focus + points */}
      <div className="flex items-stretch gap-3 mb-4">
        <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
          <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1">Фокус</p>
          <p className="text-sm font-semibold text-indigo-800">{suggestion.focus}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center min-w-[80px]">
          <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider mb-1">Өсім</p>
          <p className="text-2xl font-black text-green-600">+{suggestion.expectedImprovementPoints}</p>
          <p className="text-[10px] text-green-500">балл</p>
        </div>
      </div>

      {/* Changes list */}
      {changes.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-2">Нені өзгерту керек:</p>
          <ul className="space-y-2">
            {changes.map((change, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-indigo-400 font-bold mt-0.5">→</span>
                <span>{change}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
