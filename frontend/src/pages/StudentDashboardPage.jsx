import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import ClassroomCard from '../components/ClassroomCard';

export default function StudentDashboardPage() {
  const [data, setData] = useState({ classrooms: [], recentSubmissions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const res = await api.get('/student/dashboard');
      if (res && !res.error) {
        setData({
          classrooms: res.classrooms || [],
          recentSubmissions: res.recentSubmissions || []
        });
      } else {
        setError(res?.error || 'Деректерді жүктеу мүмкін болмады');
      }
    } catch (err) {
      console.error(err);
      setError('Сервермен байланыс үзілді');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();
    setIsJoining(true);
    try {
      const res = await api.post('/classroom/join', { inviteCode });
      if (res.classroom) {
        alert('Класқа сәтті қосылдыңыз!');
        setInviteCode('');
        loadDashboardData();
      } else if (res.error) {
        alert(res.error);
      }
    } catch (err) {
      alert('Қате орын алды');
    } finally {
      setIsJoining(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="text-4xl mb-4">❌</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Қате орын алды</h2>
      <p className="text-gray-500 mb-6">{error}</p>
      <button 
        onClick={() => { setError(null); setLoading(true); loadDashboardData(); }}
        className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all"
      >
        Қайтадан көру
      </button>
    </div>
  );

  return (
    <div className="py-8 space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Менің оқуым</h1>
          <p className="text-gray-500 mt-1">Курстарыңыз бен соңғы тапсырмаларыңыз</p>
        </div>
        
        <form onSubmit={handleJoinClass} className="w-full md:w-auto flex gap-2">
          <input 
            type="text" 
            placeholder="Сынып коды (6 таңба)"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold w-full md:w-48"
          />
          <button 
            type="submit"
            disabled={isJoining || inviteCode.length < 6}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 whitespace-nowrap"
          >
            Класқа қосылу
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left: Classes */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-gray-800">Менің сыныптарым</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.classrooms.map(cls => (
              <ClassroomCard 
                key={cls.id} 
                classroom={cls} 
                onClick={() => navigate(`/upload?classId=${cls.id}`)}
              />
            ))}
            {data.classrooms.length === 0 && (
              <div className="col-span-2 py-12 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <p className="text-gray-400">Сіз әлі ешқандай класқа қосылмағансыз</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Submissions */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-800">Соңғы жұмыстар</h2>
          <div className="space-y-3">
            {data.recentSubmissions.map(sub => (
              <div key={sub.id} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-gray-800 line-clamp-1">
                    {sub.title === 'Студент жұмысы' ? 'Сіздің жұмысыңыз' : sub.title}
                  </h4>
                  <p className="text-xs text-gray-400">{new Date(sub.createdAt).toLocaleDateString('kk-KZ')}</p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-indigo-600">{sub.evaluation?.totalScore || '—'}/100</div>
                  <Link to={`/result?id=${sub.id}`} className="text-[10px] text-gray-400 hover:text-indigo-600 underline">
                    Нәтижені көру
                  </Link>
                </div>
              </div>
            ))}
            {data.recentSubmissions.length === 0 && (
              <p className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-2xl">
                Жұмыстар тізімі бос
              </p>
            )}
            {data.recentSubmissions.length > 0 && (
              <Link to="/submissions" className="block text-center text-sm text-indigo-600 hover:underline pt-2">
                Барлығын көру →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
