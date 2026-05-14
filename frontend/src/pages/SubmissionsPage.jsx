import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const res = await api.get('/student/submissions');
      if (res && !res.error) {
        setSubmissions(res.submissions || []);
      } else {
        setError(res?.error || 'Жұмыстарды жүктеу мүмкін болмады');
      }
    } catch (err) {
      setError('Сервермен байланыс үзілді');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Менің жұмыстарым</h1>
          <p className="text-gray-500 mt-1">Барлық тапсырылған жобалар мен олардың бағалары</p>
        </div>
        <Link to="/upload" className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-all">
          + Жаңа жұмыс
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-700">Жоба атауы</th>
              <th className="px-6 py-4 font-bold text-gray-700">Сынып</th>
              <th className="px-6 py-4 font-bold text-gray-700">Күні</th>
              <th className="px-6 py-4 font-bold text-gray-700 text-center">Ұпай</th>
              <th className="px-6 py-4 font-bold text-gray-700"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {submissions.map((sub) => (
              <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-800">
                    {sub.title === 'Студент жұмысы' ? 'Сіздің жұмысыңыз' : sub.title}
                  </div>
                  <div className="text-xs text-gray-400">ID: {sub.id?.split('-')[0] || '---'}</div>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {sub.classroom?.name || 'Кластан тыс'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('kk-KZ') : '---'}
                </td>
                <td className="px-6 py-4 text-center">
                  {sub.evaluation ? (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      sub.evaluation.totalScore >= 85 ? 'bg-green-100 text-green-700' :
                      sub.evaluation.totalScore >= 70 ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {sub.evaluation.totalScore}/100
                    </span>
                  ) : sub.status === 'error' ? (
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">Қате</span>
                  ) : (
                    <span className="text-gray-400 italic">Тексерілуде...</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link 
                    to={`/result?id=${sub.id}`} 
                    className="text-indigo-600 hover:text-indigo-800 font-bold text-sm"
                  >
                    Толығырақ →
                  </Link>
                </td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                  Сіз әлі ешқандай жұмыс жүктемегенсіз.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
