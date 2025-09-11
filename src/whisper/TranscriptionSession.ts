import { Logger, LoggerLevelsType } from '../utils/Logger';
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

type TResolver = ((value: WhisperWasmServiceCallbackParams | undefined) => void) | null;

export class TranscriptionSession {
  private logger: Logger;

  constructor(
    private whisperService: WhisperWasmService, 
    options?: { logLevel: LoggerLevelsType }) {
    this.logger = new Logger(options?.logLevel || Logger.levels.ERROR, 'TranscriptionSession');
  }

  async *streamimg(
    audioData: Float32Array,
    options: WhisperWasmTranscriptionOptions = {},
  ): AsyncIterableIterator<WhisperWasmServiceCallbackParams> {
    const audioDataChunks = splitFloat32Array(audioData);
    let lastSegmentTimeEnd = 0;
    for await (const chunk of audioDataChunks) {
      const queue: WhisperWasmServiceCallbackParams[] = [];
      let resolver: TResolver = null;
      let done = false;
      let error: any;
      let currentSegmentTimeEnd = 0;

      this.whisperService.transcribe(chunk, (segment) => {
        currentSegmentTimeEnd = segment.timeEnd;
        segment.timeStart += lastSegmentTimeEnd;
        segment.timeEnd += lastSegmentTimeEnd;
        if (resolver) {
          resolver(segment);
          resolver = null;
        } else {
          queue.push(segment);
        }
      }, options).then(() => {
        done = true;
        lastSegmentTimeEnd += currentSegmentTimeEnd;
        resolver?.(undefined); 
      }).catch((e) => {
        error = e;
      });

      while (true) {
        if (error) throw error;
        if (done) break;
        if (queue.length) {
          yield queue.shift()!;
        } else {
          const result = await new Promise((r: TResolver) => (resolver = r));
          if (result) {
            yield result;
          }
        }
      }
    }
  }
}
