import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Layout/Navbar';
import { ProtectedRoute } from './components/Layout/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TeacherDashboardPage from './pages/TeacherDashboardPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import UploadPage from './pages/UploadPage';
import ResultPage from './pages/ResultPage';
import SubmissionsPage from './pages/SubmissionsPage';
import { useAuth } from './hooks/useAuth';
import './index.css';

function App() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Router>
      <Navbar />
      <div className="container mx-auto px-4">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route path="/teacher/dashboard" element={
            <ProtectedRoute allowedRole="teacher">
              <TeacherDashboardPage />
            </ProtectedRoute>
          } />

          <Route path="/student/dashboard" element={
            <ProtectedRoute allowedRole="student">
              <StudentDashboardPage />
            </ProtectedRoute>
          } />
          
          <Route path="/upload" element={
            <ProtectedRoute allowedRole="student">
              <UploadPage />
            </ProtectedRoute>
          } />
          
          <Route path="/result" element={
            <ProtectedRoute>
              <ResultPage />
            </ProtectedRoute>
          } />

          <Route path="/submissions" element={
            <ProtectedRoute>
              <SubmissionsPage />
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            user?.role === 'teacher' 
              ? <Navigate to="/teacher/dashboard" replace /> 
              : <Navigate to="/student/dashboard" replace />
          } />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
