import { LoginForm } from '../components/Auth/LoginForm';
import { Link } from 'react-router-dom';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">🤖</span>
          <h1 className="text-2xl font-bold text-gray-800 mt-3">AI Code Reviewer</h1>
          <p className="text-gray-500 text-sm mt-1">HTML/CSS кодын тексеру жүйесі</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Жүйеге кіру</h2>
          <LoginForm />
          <p className="text-center text-sm text-gray-500 mt-6">
            Аккаунтыңыз жоқ па?{' '}
            <Link to="/register" className="text-indigo-600 font-medium hover:underline">
              Тіркелу
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
