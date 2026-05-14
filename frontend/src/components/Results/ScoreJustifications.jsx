/**
 * Блок "Ұпайлардың негіздемесі" — детальное обоснование баллов.
 * Показывает:
 *  1. scoringRationale — полный нарратив "почему HTML 18/30"
 *  2. deductionReasons / assessmentBreakdown — каждый критерий с codeSnippet и line
 */

const catMeta = {
  html: { label: 'HTML Құрылымы', icon: '🏗️', max: 30, color: 'blue' },
  css:  { label: 'CSS Сапасы',    icon: '🎨', max: 30, color: 'purple' },
  ui:   { label: 'UI/UX',         icon: '🖥️', max: 40, color: 'orange' },
};

const palette = {
  blue:   { bar: 'bg-blue-500',   bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   header: 'bg-blue-50',   rationale: 'bg-blue-50 border-blue-200 text-blue-900' },
  purple: { bar: 'bg-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', header: 'bg-purple-50', rationale: 'bg-purple-50 border-purple-200 text-purple-900' },
  orange: { bar: 'bg-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', header: 'bg-orange-50', rationale: 'bg-orange-50 border-orange-200 text-orange-900' },
};

const getRuleStyle = (passed, earned, max) => {
  if (passed === true)  return { icon: '✓', iconColor: 'text-green-600', bg: 'bg-green-50 border-green-100' };
  if (passed === false) return { icon: '✗', iconColor: 'text-red-500',   bg: 'bg-red-50 border-red-100' };
  const pct = max ? earned / max : 0;
  if (pct >= 0.75) return { icon: '✓', iconColor: 'text-green-600', bg: 'bg-green-50 border-green-100' };
  if (pct >= 0.5)  return { icon: '~', iconColor: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-100' };
  return { icon: '✗', iconColor: 'text-red-500', bg: 'bg-red-50 border-red-100' };
};

const RuleRow = ({ r }) => {
  const style = getRuleStyle(r.passed, r.earnedPoints, r.maxPoints);
  const deducted = (r.maxPoints || 0) - (r.earnedPoints || 0);

  return (
    <div className={`rounded-xl border px-5 py-4 ${style.bg} transition-all hover:shadow-md space-y-3`}>
      {/* ── Header: Rule ID + Name + Score ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${style.iconColor}`}>{style.icon}</span>
          <div className="flex items-center gap-1.5">
            {r.rule && (
              <span className="text-[10px] font-bold bg-gray-800 text-white px-1.5 py-0.5 rounded uppercase tracking-wider">
                {r.rule}
              </span>
            )}
            <span className="text-sm font-bold text-gray-900">
              {r.ruleName || r.criterion}
            </span>
          </div>
        </div>
        
        {r.maxPoints !== undefined && (
          <div className="flex items-center gap-2">
             <span className={`text-sm font-black ${style.iconColor}`}>
              {r.earnedPoints} / {r.maxPoints}
            </span>
            {deducted > 0 && (
              <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                -{deducted} ұпай
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Metadata: Line number ── */}
      {r.line && (
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
          <span className="opacity-70">📍 Орын:</span>
          <code className="bg-white/50 border border-gray-200 px-1.5 py-0.5 rounded text-gray-700">
            {r.line}
          </code>
        </div>
      )}

      {/* ── Explanation: Why this is bad ── */}
      {r.detail && (
        <div className="bg-white/40 rounded-lg p-3 border border-black/5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            Неліктен бұл қате?
          </p>
          <p className="text-sm text-gray-700 leading-relaxed font-medium italic">
            {r.detail}
          </p>
        </div>
      )}

      {/* ── Code Snippet: Student's code ── */}
      {r.codeSnippet && r.codeSnippet !== "" && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Студенттің коды:
          </p>
          <div className="relative group">
            <pre className="text-xs bg-gray-900 text-gray-300 rounded-xl p-4 overflow-x-auto font-mono leading-relaxed border-l-4 border-red-500/50 shadow-inner">
              {r.codeSnippet}
            </pre>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[9px] bg-white/10 text-white/50 px-2 py-1 rounded">ReadOnly</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ScoreJustifications = ({ scoreJustifications }) => {
  if (!scoreJustifications) return null;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-indigo-100">
          🎯
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ұпайлардың негіздемесі</h2>
          <p className="text-sm text-gray-500">Әр категория бойынша егжей-тегжейлі талдау</p>
        </div>
      </div>

      {['html', 'css', 'ui'].map(cat => {
        const data = scoreJustifications[cat];
        if (!data) return null;

        const meta = catMeta[cat];
        const c    = palette[meta.color];
        const pct  = Math.round(((data.earnedScore || 0) / meta.max) * 100);
        const deducted = meta.max - (data.earnedScore || 0);
        const rows = data.deductionReasons || data.assessmentBreakdown || [];

        return (
          <div key={cat} className={`rounded-3xl border ${c.border} overflow-hidden bg-white shadow-sm`}>
            {/* ── Category Header ── */}
            <div className={`${c.header} px-6 py-5 flex items-center justify-between border-b ${c.border}`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm bg-white border ${c.border}`}>
                  {meta.icon}
                </div>
                <div>
                  <span className={`font-black text-lg block ${c.text}`}>{meta.label}</span>
                  <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Category Review</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200/50 rounded-full h-3 overflow-hidden border border-black/5">
                    <div
                      className={`h-full rounded-full ${c.bar} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.1)]`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-2xl font-black ${c.text} tracking-tight`}>
                    {data.earnedScore}<span className="text-gray-300 mx-1">/</span>{meta.max}
                  </span>
                </div>
                {deducted > 0 && (
                  <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                    -{deducted} ұпай шегерілді
                  </span>
                )}
              </div>
            </div>

            <div className="px-6 py-6 space-y-6">
              {/* ── Narrative Summary ── */}
              {data.scoringRationale && (
                <div className={`rounded-2xl border p-5 ${c.rationale} shadow-sm relative overflow-hidden group`}>
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="text-4xl font-black">?</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white shadow-sm border ${c.border}`}>
                      📊
                    </div>
                    <span className={`text-sm font-black uppercase tracking-wider ${c.text}`}>
                      Неліктен {data.earnedScore}/{meta.max}?
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed font-medium">
                    {data.scoringRationale}
                  </p>
                </div>
              )}

              {/* ── Criteria List ── */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    Критерий бойынша бөлшектеу
                  </h4>
                  <span className="text-[10px] font-bold text-gray-300">
                    {rows.length} элемент табылды
                  </span>
                </div>
                
                {rows.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {rows.map((r, idx) => <RuleRow key={idx} r={r} />)}
                  </div>
                ) : (
                  <div className={`p-4 rounded-xl text-center border-2 border-dashed ${deducted > 0 ? 'bg-red-50 border-red-100 text-red-500' : 'bg-green-50 border-green-100 text-green-600'}`}>
                    <p className="text-sm font-bold">
                      {deducted > 0 
                        ? '⚠ Жүйе бұл критерийлерді талдай алмады.' 
                        : '✓ Барлық талаптар сәтті орындалды!'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
