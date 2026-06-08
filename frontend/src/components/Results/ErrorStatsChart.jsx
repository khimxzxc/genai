import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Круговая диаграмма для визуализации статистики типов ошибок.
 * Используется на дашборде преподавателя для защиты перед комиссией.
 * 
 * Данные: 3 категории — HTML (Семантика), CSS (BEM/Layout), UI (WCAG/Контраст)
 * 
 * @param {{ stats: { html: number, css: number, ui: number } }} props
 */

/** Цвета для категорий — гармоничная палитра */
const COLORS = ['#6366f1', '#06b6d4', '#f59e0b']; // indigo, cyan, amber

/** Казахские подписи категорий */
const CATEGORY_LABELS = {
  html: 'HTML Семантика',
  css:  'CSS / БЭМ',
  ui:   'UI / WCAG',
};

/**
 * Кастомный label для секторов диаграммы — показывает процент.
 */
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null; // Не показываем для маленьких секторов
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" 
          fontSize={13} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function ErrorStatsChart({ stats }) {
  // Если нет данных — показываем заглушку
  if (!stats || (stats.html === 0 && stats.css === 0 && stats.ui === 0)) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>📊</span> Қате түрлерінің статистикасы
        </h3>
        <div className="text-center py-8 text-gray-400 text-sm">
          Әзірге деректер жоқ. Студенттер жұмыс жіберген соң статистика пайда болады.
        </div>
      </div>
    );
  }

  const data = [
    { name: CATEGORY_LABELS.html, value: stats.html, category: 'HTML' },
    { name: CATEGORY_LABELS.css,  value: stats.css,  category: 'CSS' },
    { name: CATEGORY_LABELS.ui,   value: stats.ui,   category: 'UI' },
  ].filter(d => d.value > 0);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
        <span>📊</span> Қате түрлерінің статистикасы
      </h3>
      <p className="text-xs text-gray-400 mb-4">Барлық тексерулердегі қателер бөлінісі</p>
      
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={40}
            paddingAngle={3}
            dataKey="value"
            labelLine={false}
            label={renderCustomLabel}
            animationBegin={0}
            animationDuration={800}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => [`${value} қате (${((value / total) * 100).toFixed(1)}%)`, '']}
            contentStyle={{ 
              borderRadius: '12px', 
              border: '1px solid #e5e7eb',
              fontSize: '13px',
            }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Мини-статистика */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        {data.map((item, i) => (
          <div key={item.name} className="text-center">
            <div className="text-lg font-bold" style={{ color: COLORS[i] }}>{item.value}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide">{item.category}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
