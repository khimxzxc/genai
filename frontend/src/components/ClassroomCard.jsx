import { useAuth } from '../hooks/useAuth';

export default function ClassroomCard({ classroom, isSelected, onClick }) {
  const { user } = useAuth();
  const isStudent = user?.role === 'student';

  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-xl border cursor-pointer transition-all ${
        isSelected 
          ? 'border-indigo-600 bg-indigo-50 shadow-md' 
          : 'border-gray-100 bg-white hover:border-indigo-300 hover:shadow-sm'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-gray-800">{classroom.name}</h3>
        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-500">
          {classroom.inviteCode}
        </span>
      </div>
      <p className="text-sm text-gray-500 line-clamp-1 mb-3">
        {classroom.description || 'Сипаттамасы жоқ'}
      </p>
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <span>👥</span> {classroom._count?.students || 0} студент
        </div>
        <div className="flex items-center gap-1">
          <span>📄</span> {classroom._count?.submissions || 0} {isStudent ? 'сіздің жұмысыңыз' : 'жұмыс'}
        </div>
      </div>
    </div>
  );
}

