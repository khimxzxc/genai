import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <span className="text-5xl block mb-3">👋</span>
        <h1 className="text-2xl font-bold text-gray-800">
          Қош келдіңіз, {user?.email}!
        </h1>
        <p className="text-gray-500 mt-2">AI Code Reviewer жүйесіне қош келдіңіз.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/upload"
          className="bg-indigo-600 text-white rounded-2xl p-6 hover:bg-indigo-700 transition-colors shadow-md"
        >
          <div className="text-3xl mb-3">🚀</div>
          <h2 className="text-xl font-bold mb-1">Кодты тексеру</h2>
          <p className="text-indigo-200 text-sm">.html және .css файлдарыңызды жүктеп, ИИ бағалауын алыңыз</p>
        </Link>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="text-3xl mb-3">📊</div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Бағалау жүйесі</h2>
          <ul className="text-sm text-gray-500 space-y-1 mt-2">
            <li>🏗️ HTML Құрылымы — 30 балл</li>
            <li>🎨 CSS Сапасы — 30 балл</li>
            <li>🖥️ UI/UX Интерфейс — 40 балл</li>
          </ul>
        </div>
      </div>

      {/* Knowledge Base Section */}
      <div className="mt-8 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📚</span>
          <h2 className="text-xl font-bold text-gray-800">Білім базасы</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Код жазу барысында ескеру қажет стандарттар мен ережелер:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a href="https://developer.mozilla.org/ru/docs/Web/HTML" target="_blank" rel="noreferrer" className="block p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <h3 className="font-bold text-gray-700">W3C HTML5</h3>
            <p className="text-xs text-gray-500 mt-1">Семантикалық тегтерді дұрыс қолдану ережелері.</p>
          </a>
          <a href="https://ru.bem.info/methodology/" target="_blank" rel="noreferrer" className="block p-4 border border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-colors">
            <h3 className="font-bold text-gray-700">BEM CSS</h3>
            <p className="text-xs text-gray-500 mt-1">CSS кластарын блок-элемент-модификатор форматында жазу.</p>
          </a>
          <a href="https://www.w3.org/WAI/standards-guidelines/wcag/" target="_blank" rel="noreferrer" className="block p-4 border border-gray-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-colors">
            <h3 className="font-bold text-gray-700">WCAG 2.1</h3>
            <p className="text-xs text-gray-500 mt-1">Контраст, оқылымдылық және UI қолжетімділігі.</p>
          </a>
        </div>
      </div>
    </div>
  );
}
