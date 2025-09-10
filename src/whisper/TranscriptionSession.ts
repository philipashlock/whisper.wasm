import {
  type WhisperWasmTranscriptionOptions,
  type WhisperWasmServiceCallbackParams,
} from './types';
import { WhisperWasmService } from './WhisperWasmService';

function splitFloat32Array(arr: Float32Array, chunkSize = 16000 * 100) {
  const result: Float32Array[] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    result.push(arr.subarray(i, i + chunkSize));
  }
  return result;
}

export class TranscriptionSession {
  constructor(private whisperService: WhisperWasmService) {}

  async *streamimg(
    audioData: Float32Array,
    options: WhisperWasmTranscriptionOptions = {},
  ): AsyncIterableIterator<WhisperWasmServiceCallbackParams> {
    const audioDataChunks = splitFloat32Array(audioData);
    for await (const chunk of audioDataChunks) {
      const { segments } = await this.whisperService.transcribe(chunk, undefined, options);

      for (const segment of segments) {
        yield segment;
      }
    }
  }
}
