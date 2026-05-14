/**
 * Блок "Оқу жоспары" — план обучения с приоритетами и практическими заданиями.
 */

const importanceConfig = {
  'HIGH':      { label: 'Жоғары',    color: 'bg-red-100 text-red-700',    dot: 'bg-red-500' },
  'VERY HIGH': { label: 'Өте жоғары', color: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  'MEDIUM':    { label: 'Орташа',    color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  'LOW':       { label: 'Төмен',     color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
};

const priorityIcon = ['', '🥇', '🥈', '🥉'];

export const LearningPath = ({ recommendations }) => {
  if (!recommendations?.length) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200">
      <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
        <span>📚</span> Оқу жоспары
      </h2>
      <div className="space-y-4">
        {recommendations.map((rec, idx) => {
          const imp = importanceConfig[rec.importance] || importanceConfig['MEDIUM'];
          return (
            <div key={idx} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10 space-y-2">
              {/* Top row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{priorityIcon[rec.priority] || `#${rec.priority}`}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${imp.color}`}>
                    {imp.label}
                  </span>
                </div>
                <span className="text-[10px] text-white/60 italic">{rec.estimatedTime}</span>
              </div>

              {/* Topic */}
              <h4 className="font-bold text-sm text-white leading-tight">{rec.topic}</h4>

              {/* Reason */}
              <p className="text-xs text-indigo-100 leading-relaxed">{rec.reason}</p>

              {/* Practice task */}
              {rec.practiceTask && (
                <div className="bg-white/10 border border-white/10 rounded-lg p-2 text-[11px] text-indigo-100 italic">
                  <span className="not-italic font-semibold text-white">Тапсырма: </span>
                  {rec.practiceTask}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
