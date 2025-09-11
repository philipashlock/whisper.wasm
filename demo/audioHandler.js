// Audio file handler for Whisper.wasm
export class AudioHandler {
  constructor() {
    this.kMaxAudio_s = 30 * 60; // 30 minutes maximum
    this.kMaxRecording_s = 2 * 60; // 2 minutes for recording
    this.kSampleRate = 16000; // 16kHz sample rate for Whisper

    // Initialize AudioContext
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    window.OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;

    this.context = null;
  }

  /**
   * Creates AudioContext with proper settings for Whisper
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
   * Loads and processes audio file
   * @param {File} file - audio file
   * @param {Function} onProgress - progress callback
   * @param {Function} onSuccess - success callback
   * @param {Function} onError - error callback
   */
  async loadAudio(file, onProgress, onSuccess, onError) {
    if (!file) {
      onError('No file selected');
      return;
    }

    onProgress(`Loading audio: ${file.name}, size: ${file.size} bytes`);
    onProgress('Please wait...');

    try {
      const context = this.createAudioContext();

      // Read file
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      const uint8Array = new Uint8Array(arrayBuffer);

      // Decode audio
      const audioBuffer = await context.decodeAudioData(uint8Array.buffer);

      // Create OfflineAudioContext for rendering
      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate,
      );

      // Create source and connect to context
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start(0);

      // Render audio
      const renderedBuffer = await offlineContext.startRendering();
      let audio = renderedBuffer.getChannelData(0);

      onProgress(`Audio loaded, size: ${audio.length} samples`);

      onSuccess(audio, {
        sampleRate: audioBuffer.sampleRate,
        duration: audio.length / audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
      });
    } catch (error) {
      console.error('Audio decoding error:', error);
      onError(`Audio decoding error: ${error.message}`);
    }
  }

  /**
   * Reads file as ArrayBuffer
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
   * Checks Web Audio API support
   */
  isSupported() {
    return !!(window.AudioContext || window.webkitAudioContext);
  }

  /**
   * Gets information about supported formats
   */
  getSupportedFormats() {
    return ['MP3', 'WAV', 'OGG', 'M4A', 'FLAC', 'AAC'];
  }
}
