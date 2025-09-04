// Обработчик аудио файлов для Whisper.wasm
export class AudioHandler {
  constructor() {
    this.kMaxAudio_s = 30 * 60; // 30 минут максимум
    this.kMaxRecording_s = 2 * 60; // 2 минуты для записи
    this.kSampleRate = 16000; // 16kHz sample rate для Whisper
    
    // Инициализируем AudioContext
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    window.OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    
    this.context = null;
  }

  /**
   * Создает AudioContext с правильными настройками для Whisper
   */
  createAudioContext() {
    if (!this.context) {
      this.context = new AudioContext({
        sampleRate: this.kSampleRate,
        channelCount: 1,
        echoCancellation: false,
        autoGainControl: true,
        noiseSuppression: true,
      });
    }
    return this.context;
  }

  /**
   * Загружает и обрабатывает аудио файл
   * @param {File} file - аудио файл
   * @param {Function} onProgress - колбэк для прогресса
   * @param {Function} onSuccess - колбэк при успехе
   * @param {Function} onError - колбэк при ошибке
   */
  async loadAudio(file, onProgress, onSuccess, onError) {
    if (!file) {
      onError('Файл не выбран');
      return;
    }

    onProgress(`Загрузка аудио: ${file.name}, размер: ${file.size} байт`);
    onProgress('Пожалуйста, подождите...');

    try {
      const context = this.createAudioContext();
      
      // Читаем файл
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      const uint8Array = new Uint8Array(arrayBuffer);

      // Декодируем аудио
      const audioBuffer = await context.decodeAudioData(uint8Array.buffer);
      
      // Создаем OfflineAudioContext для рендеринга
      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );

      // Создаем источник и подключаем к контексту
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start(0);

      // Рендерим аудио
      const renderedBuffer = await offlineContext.startRendering();
      let audio = renderedBuffer.getChannelData(0);

      onProgress(`Аудио загружено, размер: ${audio.length} сэмплов`);

      // Обрезаем до первых 30 минут если нужно
      if (audio.length > this.kMaxAudio_s * this.kSampleRate) {
        audio = audio.slice(0, this.kMaxAudio_s * this.kSampleRate);
        onProgress(`Аудио обрезано до первых ${this.kMaxAudio_s} секунд`);
      }

      onSuccess(audio, {
        sampleRate: audioBuffer.sampleRate,
        duration: audio.length / audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels
      });

    } catch (error) {
      console.error('Ошибка декодирования аудио:', error);
      onError(`Ошибка декодирования аудио: ${error.message}`);
    }
  }

  /**
   * Читает файл как ArrayBuffer
   */
  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Проверяет поддержку Web Audio API
   */
  isSupported() {
    return !!(window.AudioContext || window.webkitAudioContext);
  }

  /**
   * Получает информацию о поддерживаемых форматах
   */
  getSupportedFormats() {
    return [
      'MP3',
      'WAV', 
      'OGG',
      'M4A',
      'FLAC',
      'AAC'
    ];
  }
}
