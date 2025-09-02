import { WhisperWasm } from '../whisper';
import { WhisperOptions } from '../types';

// Mock the global window.Module
const mockModule = {
  onRuntimeInitialized: null,
  onAbort: null,
  whisper_full: jest.fn(),
  whisper_full_n_segments: jest.fn(),
  whisper_full_get_segment_t0: jest.fn(),
  whisper_full_get_segment_t1: jest.fn(),
  whisper_full_get_segment_text: jest.fn(),
  whisper_full_get_segment_temperature: jest.fn(),
  whisper_full_get_segment_avg_logprob: jest.fn(),
  whisper_full_get_segment_compression_ratio: jest.fn(),
  whisper_full_get_segment_no_speech_prob: jest.fn(),
  whisper_full_get_text: jest.fn(),
  whisper_full_get_lang: jest.fn(),
  whisper_full_n_tokens: jest.fn(),
  whisper_full_get_token_id: jest.fn(),
};

// Mock DOM methods
Object.defineProperty(document, 'createElement', {
  value: jest.fn(() => ({
    src: '',
    onload: null,
    onerror: null,
  })),
});

Object.defineProperty(document.head, 'appendChild', {
  value: jest.fn(),
});

// Mock window.Module
Object.defineProperty(window, 'Module', {
  value: mockModule,
  writable: true,
});

describe('WhisperWasm', () => {
  let whisper: WhisperWasm;

  beforeEach(() => {
    jest.clearAllMocks();
    whisper = new WhisperWasm();
  });

  afterEach(() => {
    whisper.free();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      // Mock successful module loading
      const mockScript = {
        src: '',
        onload: null,
        onerror: null,
      };
      (document.createElement as jest.Mock).mockReturnValue(mockScript);

      // Mock successful runtime initialization
      mockModule.onRuntimeInitialized = jest.fn();

      await whisper.init();

      expect(mockModule.onRuntimeInitialized).toBeDefined();
    });

    it('should throw error if module fails to load', async () => {
      const mockScript = {
        src: '',
        onload: null,
        onerror: null,
      };
      (document.createElement as jest.Mock).mockReturnValue(mockScript);

      // Mock failed module loading
      Object.defineProperty(window, 'Module', {
        value: undefined,
        writable: true,
      });

      await expect(whisper.init()).rejects.toThrow('Failed to load whisper.js module');
    });
  });

  describe('transcription', () => {
    beforeEach(async () => {
      // Mock successful initialization
      const mockScript = {
        src: '',
        onload: null,
        onerror: null,
      };
      (document.createElement as jest.Mock).mockReturnValue(mockScript);
      mockModule.onRuntimeInitialized = jest.fn();
      await whisper.init();
    });

    it('should transcribe audio successfully', async () => {
      const audioData = new Float32Array([0.1, 0.2, 0.3]);
      const options: WhisperOptions = {
        model: 'base',
        language: 'en',
      };

      // Mock successful transcription
      const mockResult = { success: true };
      mockModule.whisper_full.mockReturnValue(mockResult);
      mockModule.whisper_full_n_segments.mockReturnValue(1);
      mockModule.whisper_full_get_segment_t0.mockReturnValue(0);
      mockModule.whisper_full_get_segment_t1.mockReturnValue(1000);
      mockModule.whisper_full_get_segment_text.mockReturnValue('Hello world');
      mockModule.whisper_full_get_segment_temperature.mockReturnValue(0.0);
      mockModule.whisper_full_get_segment_avg_logprob.mockReturnValue(-0.5);
      mockModule.whisper_full_get_segment_compression_ratio.mockReturnValue(1.0);
      mockModule.whisper_full_get_segment_no_speech_prob.mockReturnValue(0.1);
      mockModule.whisper_full_get_text.mockReturnValue('Hello world');
      mockModule.whisper_full_get_lang.mockReturnValue('en');
      mockModule.whisper_full_n_tokens.mockReturnValue(2);
      mockModule.whisper_full_get_token_id.mockReturnValue(123);

      const result = await whisper.transcribe(audioData, options);

      expect(result).toEqual({
        text: 'Hello world',
        segments: [
          {
            id: 0,
            seek: 0,
            start: 0,
            end: 10,
            text: 'Hello world',
            tokens: [123, 123],
            temperature: 0.0,
            avgLogprob: -0.5,
            compressionRatio: 1.0,
            noSpeechProb: 0.1,
          },
        ],
        language: 'en',
      });
    });

    it('should throw error if not initialized', async () => {
      const uninitializedWhisper = new WhisperWasm();
      const audioData = new Float32Array([0.1, 0.2, 0.3]);
      const options: WhisperOptions = { model: 'base' };

      await expect(uninitializedWhisper.transcribe(audioData, options))
        .rejects.toThrow('WhisperWasm not initialized. Call init() first.');
    });

    it('should handle progress callbacks', async () => {
      const audioData = new Float32Array([0.1, 0.2, 0.3]);
      const options: WhisperOptions = { model: 'base' };
      const progressCallback = jest.fn();

      const mockResult = { success: true };
      mockModule.whisper_full.mockReturnValue(mockResult);
      mockModule.whisper_full_n_segments.mockReturnValue(0);
      mockModule.whisper_full_get_text.mockReturnValue('');
      mockModule.whisper_full_get_lang.mockReturnValue('en');

      await whisper.transcribe(audioData, options, progressCallback);

      // The progress callback should be passed to the WASM module
      expect(mockModule.whisper_full).toHaveBeenCalledWith(
        audioData,
        expect.any(Object),
        progressCallback
      );
    });
  });

  describe('error handling', () => {
    it('should handle transcription failures', async () => {
      const audioData = new Float32Array([0.1, 0.2, 0.3]);
      const options: WhisperOptions = { model: 'base' };

      // Mock failed transcription
      mockModule.whisper_full.mockReturnValue(null);

      await expect(whisper.transcribe(audioData, options))
        .rejects.toThrow('Transcription failed');
    });
  });
});
