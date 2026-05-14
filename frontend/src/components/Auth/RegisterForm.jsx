import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const RegisterForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('student');
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await register(email, password, fullName, role, role === 'student' ? groupName : undefined);

      if (result && result.error) {
        setError(result.error);
      } else if (result && result.user) {
        // Регистрация успешна — токен уже сохранён в useAuth, идём на дашборд
        navigate(role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
      } else {
        setError('Тіркелу кезінде белгісіз қате орын алды');
      }
    } catch (err) {
      setError('Күтпеген қате: ' + (err.message || 'Байланыс үзілді'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}
      
      {/* Role Selection */}
      <div className="flex gap-4 mb-4">
        <label className={`flex-1 cursor-pointer rounded-lg border p-3 text-center transition-colors ${role === 'student' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          <input type="radio" name="role" value="student" className="hidden" checked={role === 'student'} onChange={() => setRole('student')} />
          Студент
        </label>
        <label className={`flex-1 cursor-pointer rounded-lg border p-3 text-center transition-colors ${role === 'teacher' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          <input type="radio" name="role" value="teacher" className="hidden" checked={role === 'teacher'} onChange={() => setRole('teacher')} />
          Оқытушы
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Толық аты-жөні</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Иванов Иван"
        />
      </div>

      {role === 'student' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Топ атауы (Group)</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="ИС-21"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="email@example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Кемінде 6 таңба"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
      >
        {loading ? 'Тіркелуде...' : 'Тіркелу'}
      </button>
    </form>
  );
};

