/**
 * Сервис для создания скриншота HTML/CSS кода студента через Puppeteer.
 * Возвращает скриншот в формате base64 для передачи в Groq API.
 */
import puppeteer from 'puppeteer';

/**
 * Создаёт скриншот из локального HTML файла.
 * @param {string} absoluteHtmlPath - Абсолютный путь к точке входа (index.html)
 * @returns {Promise<string>} base64-строка изображения PNG
 */
const captureScreenshot = async (absoluteHtmlPath) => {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Открываем локальный файл. Puppeteer сам подгрузит CSS и картинки по относительным путям.
    await page.goto(`file://${absoluteHtmlPath}`, { 
      waitUntil: 'networkidle0', // Ждем, пока загрузятся все ресурсы (картинки, стили)
      timeout: 15000 
    });

    const screenshotBuffer = await page.screenshot({ type: 'png', fullPage: true });
    return screenshotBuffer.toString('base64');
    
  } finally {
    if (browser) await browser.close();
  }
};

export { captureScreenshot };
