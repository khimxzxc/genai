import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 font-bold text-indigo-600 text-lg">
          <span>🤖</span>
          AI Code Reviewer
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <span className="text-gray-500 hidden sm:block">{user.email}</span>
              <Link to="/dashboard" className="text-gray-600 hover:text-indigo-600 transition-colors font-medium">
                Басты бет
              </Link>
              
              {user.role === 'student' ? (
                <>
                  <Link to="/upload" className="text-gray-600 hover:text-indigo-600 transition-colors font-medium">
                    Жүктеу
                  </Link>
                  <Link to="/submissions" className="text-gray-600 hover:text-indigo-600 transition-colors font-medium">
                    Тарих
                  </Link>
                </>
              ) : (
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-xs uppercase border border-indigo-100">
                  Оқытушы
                </span>
              )}

              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors font-medium"
              >
                Шығу
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-indigo-600 transition-colors">Кіру</Link>
              <Link to="/register" className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                Тіркелу
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
