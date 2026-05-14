import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';

export default function StudentSubmissionsModal({ student, classroomId, onClose }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (student) {
      loadSubmissions();
    }
  }, [student, classroomId]);

  const loadSubmissions = async () => {
    try {
      const url = classroomId 
        ? `/teacher/students/${student.studentId}/submissions?classroomId=${classroomId}`
        : `/teacher/students/${student.studentId}/submissions`;
      
      const data = await api.get(url);
      if (data.submissions) {
        setSubmissions(data.submissions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!student) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{student.fullName}</h2>
            <p className="text-sm text-gray-500">Жұмыстар тарихы ({submissions.length})</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <div key={sub.id} className="group bg-white rounded-2xl border border-gray-100 p-5 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-bold text-gray-800">{sub.title}</h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        sub.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {sub.status === 'done' ? 'Тексерілді' : sub.status}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-400">
                      <span>📅 {new Date(sub.createdAt).toLocaleDateString('kk-KZ')}</span>
                      <span>📄 {sub.files?.length || 0} файл</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                    {sub.evaluation ? (
                      <div className="text-center">
                        <div className="text-lg font-black text-indigo-600">{sub.evaluation.totalScore}/100</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase">{sub.evaluation.grade}</div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic">Бағаланбаған</div>
                    )}
                    
                    <Link 
                      to={`/result?id=${sub.id}`}
                      className="bg-gray-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all border border-gray-100 group-hover:border-indigo-600"
                    >
                      Көру →
                    </Link>
                  </div>
                </div>
              ))}
              
              {submissions.length === 0 && (
                <div className="text-center py-20 text-gray-400 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  Бұл студент әлі ешқандай жұмыс жібермеген.
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition-all"
          >
            Жабу
          </button>
        </div>
      </div>
    </div>
  );
}
