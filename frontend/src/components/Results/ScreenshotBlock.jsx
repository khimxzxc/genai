/**
 * Блок "Интерфейс көрінісі" — скриншот студенческого проекта.
 * Показывает реальный скриншот, если бэкенд его вернул,
 * иначе отображает placeholder.
 */
export const ScreenshotBlock = ({ screenshot }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
        <span>📸</span> Интерфейс көрінісі
      </h3>

      <div className="rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
        {screenshot ? (
          <img
            src={`data:image/png;base64,${screenshot}`}
            alt="Студент жобасының скриншоты"
            className="w-full h-auto cursor-zoom-in hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="aspect-video flex flex-col items-center justify-center gap-2 text-gray-300">
            <span className="text-4xl">🖼️</span>
            <span className="text-xs text-gray-400">Скриншот қол жетімді емес</span>
          </div>
        )}
      </div>
    </div>
  );
};
