/**
 * Детерминированное дерево решений для выставления финальной оценки и грейда.
 * Строгие пороги на основе экспертной шкалы (new.md v3).
 * 
 * Шкала:
 *   85–95 → "Өте жақсы"  (требуется: html ≥ 25, css ≥ 25, ui ≥ 33)
 *   70–84 → "Жақсы"       (требуется: html ≥ 20, css ≥ 20, ui ≥ 28)
 *   50–69 → "Қанағаттанарлық" (требуется: ui ≥ 18)
 *   0–49  → "Қанағаттанарлықсыз"
 * 
 * @param {Object} scores Объект с баллами { html, css, ui, total }
 * @returns {Object} { grade, reason }
 */
function classifyQuality(scores) {
  const html = Number(scores.html) || 0;
  const css  = Number(scores.css)  || 0;
  const ui   = Number(scores.ui)   || 0;
  let total  = Number(scores.total) || (html + css + ui);

  // Пересчитываем total если LLM ошибся в арифметике
  const calculatedTotal = html + css + ui;
  if (Math.abs(total - calculatedTotal) > 3) {
    total = calculatedTotal;
  }

  // Лимит 95 баллов (максимум по системе)
  if (total > 95) total = 95;

  // === СТРОГОЕ ДЕРЕВО РЕШЕНИЙ ===

  // Өте жақсы — все три компонента высокие
  if (total >= 85 && html >= 25 && css >= 25 && ui >= 33) {
    return { grade: 'Өте жақсы', reason: 'Барлық критерийлер бойынша жоғары сапа' };
  }

  // Жақсы — общий ≥ 70 и нет критических провалов
  if (total >= 70 && html >= 20 && css >= 20 && ui >= 28) {
    return { grade: 'Жақсы', reason: 'Жақсы сапа, шағын ескертулер бар' };
  }

  // Қанағаттанарлық — общий ≥ 50
  if (total >= 50 && ui >= 18) {
    return { grade: 'Қанағаттанарлық', reason: 'Елеулі мәселелер бар, жақсарту қажет' };
  }

  // Қанағаттанарлықсыз — всё остальное
  return { grade: 'Қанағаттанарлықсыз', reason: 'Стандарттарды сыни бұзу анықталды' };
}

export { classifyQuality };
