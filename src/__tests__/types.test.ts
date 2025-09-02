import { WhisperOptions, WhisperResult, WhisperSegment } from '../types';

describe('Types', () => {
  describe('WhisperOptions', () => {
    it('should allow all optional properties', () => {
      const options: WhisperOptions = {
        model: 'base',
        language: 'en',
        translate: true,
        temperature: 0.5,
        maxLen: 100,
        bestOf: 3,
        beamSize: 5,
        patience: 1.5,
        lengthPenalty: 1.2,
        suppressTokens: [-1, 0],
        initialPrompt: 'Hello',
        conditionOnPreviousText: false,
        fp16: false,
        temperatureInc: 0.1,
        entropyThreshold: 2.0,
        logprobThreshold: -0.8,
        noSpeechThreshold: 0.5,
      };

      expect(options.model).toBe('base');
      expect(options.language).toBe('en');
      expect(options.translate).toBe(true);
    });

    it('should require only model property', () => {
      const options: WhisperOptions = {
        model: 'tiny',
      };

      expect(options.model).toBe('tiny');
    });
  });

  describe('WhisperSegment', () => {
    it('should have all required properties', () => {
      const segment: WhisperSegment = {
        id: 0,
        seek: 100,
        start: 1.0,
        end: 2.5,
        text: 'Hello world',
        tokens: [123, 456, 789],
        temperature: 0.0,
        avgLogprob: -0.5,
        compressionRatio: 1.2,
        noSpeechProb: 0.1,
      };

      expect(segment.id).toBe(0);
      expect(segment.seek).toBe(100);
      expect(segment.start).toBe(1.0);
      expect(segment.end).toBe(2.5);
      expect(segment.text).toBe('Hello world');
      expect(segment.tokens).toEqual([123, 456, 789]);
      expect(segment.temperature).toBe(0.0);
      expect(segment.avgLogprob).toBe(-0.5);
      expect(segment.compressionRatio).toBe(1.2);
      expect(segment.noSpeechProb).toBe(0.1);
    });
  });

  describe('WhisperResult', () => {
    it('should have all required properties', () => {
      const segment: WhisperSegment = {
        id: 0,
        seek: 0,
        start: 0,
        end: 1,
        text: 'Hello',
        tokens: [123],
        temperature: 0.0,
        avgLogprob: -0.5,
        compressionRatio: 1.0,
        noSpeechProb: 0.1,
      };

      const result: WhisperResult = {
        text: 'Hello world',
        segments: [segment],
        language: 'en',
      };

      expect(result.text).toBe('Hello world');
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0]).toEqual(segment);
      expect(result.language).toBe('en');
    });
  });
});
