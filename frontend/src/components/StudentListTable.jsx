export default function StudentListTable({ students, onStudentClick, onRemoveStudent }) {
  const getGradeClass = (score) => {
    if (!score) return 'text-gray-400';
    if (score >= 85) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-blue-600 bg-blue-50';
    if (score >= 50) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-gray-100">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-4 py-3 font-semibold text-gray-700">Аты-жөні</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Email</th>
            <th className="px-4 py-3 font-semibold text-gray-700 text-center">Жұмыс саны</th>
            <th className="px-4 py-3 font-semibold text-gray-700 text-center">Орта балл</th>
            <th className="px-4 py-3 font-semibold text-gray-700 text-center">Ең жақсы</th>
            <th className="px-4 py-3 font-semibold text-gray-700"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {students.map((student) => (
            <tr key={student.studentId} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-800">{student.fullName}</td>
              <td className="px-4 py-3 text-gray-500">{student.email}</td>
              <td className="px-4 py-3 text-center text-gray-600">{student.totalSubmissions}</td>
              <td className="px-4 py-3 text-center">
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${getGradeClass(student.avgScore)}`}>
                  {student.avgScore ?? '—'}/100
                </span>
              </td>
              <td className="px-4 py-3 text-center text-gray-600">{student.bestScore ?? '—'}</td>
              <td className="px-4 py-3 text-right flex items-center justify-end gap-3">
                <button 
                  onClick={() => onStudentClick(student)}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Толығырақ →
                </button>
                <button 
                  onClick={() => onRemoveStudent(student.studentId)}
                  className="text-gray-300 hover:text-red-500 transition-colors p-1"
                  title="Класстан шығару"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                Бұл класста әзірге студенттер жоқ
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
