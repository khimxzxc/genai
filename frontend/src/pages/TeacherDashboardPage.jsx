import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import ClassroomCard from '../components/ClassroomCard';
import StudentListTable from '../components/StudentListTable';
import StudentSubmissionsModal from '../components/StudentSubmissionsModal';
import ErrorStatsChart from '../components/Results/ErrorStatsChart';

export default function TeacherDashboardPage() {
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [errorStats, setErrorStats] = useState({ html: 0, css: 0, ui: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newClassroom, setNewClassroom] = useState({ name: '', description: '' });

  useEffect(() => {
    loadClassrooms();
  }, []);

  const loadClassrooms = async () => {
    try {
      const data = await api.get('/classroom/my');
      if (data && !data.error) {
        setClassrooms(data.classrooms || []);
        if (data.classrooms?.length > 0 && !selectedClassroom) {
          setSelectedClassroom(data.classrooms[0]);
          loadStudents(data.classrooms[0].id);
        }
      } else {
        setError(data?.error || 'Сыныптарды жүктеу мүмкін болмады');
      }
    } catch (err) {
      console.error('Classrooms load error:', err);
      setError('Сервермен байланыс үзілді');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (classroomId) => {
    if (!classroomId) return;
    try {
      const data = await api.get(`/classroom/${classroomId}/students`);
      if (data && !data.error) {
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error('Students load error:', err);
    }
  };

  // Загружаем статистику ошибок по категориям для диаграммы
  const loadErrorStats = async (classroomId) => {
    try {
      const query = classroomId ? `?classroomId=${classroomId}` : '';
      const data = await api.get(`/teacher/error-stats${query}`);
      if (data && !data.error) {
        setErrorStats({ html: data.html || 0, css: data.css || 0, ui: data.ui || 0 });
      }
    } catch (err) {
      console.error('Error stats load error:', err);
    }
  };

  const handleSelectClassroom = (classroom) => {
    setSelectedClassroom(classroom);
    loadStudents(classroom.id);
    loadErrorStats(classroom.id);
  };

  const handleCreateClassroom = async (e) => {
    e.preventDefault();
    try {
      const data = await api.post('/classroom', newClassroom);
      if (data.classroom) {
        setClassrooms([data.classroom, ...classrooms]);
        setIsCreating(false);
        setNewClassroom({ name: '', description: '' });
        setSelectedClassroom(data.classroom);
        setStudents([]);
      }
    } catch (err) {
      alert('Класс құру мүмкін болмады');
    }
  };

  const handleDeleteClassroom = async (classroomId) => {
    if (!window.confirm('Бұл сыныпты және ондағы барлық жұмыстарды өшіруге сенімдісіз бе?')) return;
    try {
      const data = await api.del(`/classroom/${classroomId}`);
      if (!data.error) {
        setClassrooms(classrooms.filter(c => c.id !== classroomId));
        setSelectedClassroom(null);
        setStudents([]);
        alert('Класс сәтті өшірілді');
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Класс өшіру кезінде қате орын алды');
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!window.confirm('Студентті класстан шығаруға сенімдісіз бе?')) return;
    try {
      const data = await api.del(`/classroom/${selectedClassroom.id}/students/${studentId}`);
      if (!data.error) {
        setStudents(students.filter(s => s.studentId !== studentId));
        alert('Студент класстан шығарылды');
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Қате орын алды');
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
        onClick={() => { setError(null); setLoading(true); loadClassrooms(); }}
        className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all"
      >
        Қайтадан көру
      </button>
    </div>
  );

  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Оқытушы дашборды</h1>
          <p className="text-gray-500 mt-1">Оқу процесін басқару және нәтижелерді бақылау</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
        >
          <span>+</span> Жаңа сынып
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left: Classrooms List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-bold text-gray-700 px-1">Менің сыныптарым ({classrooms.length})</h2>
          <div className="space-y-3">
            {classrooms.map((cls) => (
              <ClassroomCard
                key={cls.id}
                classroom={cls}
                isSelected={selectedClassroom?.id === cls.id}
                onClick={() => handleSelectClassroom(cls)}
              />
            ))}
            {classrooms.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <p className="text-gray-400 text-sm">Әзірге сыныптар жоқ</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Students Table */}
        <div className="lg:col-span-3 space-y-6">
          {selectedClassroom ? (
            <>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-gray-800">{selectedClassroom.name}</h2>
                      <button 
                        onClick={() => handleDeleteClassroom(selectedClassroom.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        title="Сыныпты өшіру"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-gray-500 mt-1">{selectedClassroom.description || 'Сипаттамасы берілмеген'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Шақыру коды</span>
                    <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-xl font-mono font-black border border-indigo-100 text-lg shadow-sm">
                      {selectedClassroom.inviteCode}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800">Студенттер тізімі</h3>
                <StudentListTable 
                  students={students} 
                  onStudentClick={(s) => setSelectedStudent(s)}
                  onRemoveStudent={handleRemoveStudent}
                />
              </div>

              {/* Круговая диаграмма — статистика ошибок */}
              <div className="mt-6">
                <ErrorStatsChart stats={errorStats} />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px] bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <p className="text-gray-400">Сыныпты таңдаңыз немесе жаңасын құрыңыз</p>
            </div>
          )}
        </div>
      </div>

      {/* History Modal */}
      {selectedStudent && (
        <StudentSubmissionsModal 
          student={selectedStudent} 
          classroomId={selectedClassroom?.id}
          onClose={() => setSelectedStudent(null)} 
        />
      )}

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Жаңа сынып құру</h2>
            <form onSubmit={handleCreateClassroom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Атауы</label>
                <input 
                  type="text" 
                  required
                  value={newClassroom.name}
                  onChange={e => setNewClassroom({...newClassroom, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Мәселен: Веб-дизайн 2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Сипаттамасы</label>
                <textarea 
                  rows="3"
                  value={newClassroom.description}
                  onChange={e => setNewClassroom({...newClassroom, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Сынып туралы қысқаша ақпарат..."
                ></textarea>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Болдырмау
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Құру
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
