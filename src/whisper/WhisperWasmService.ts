
import { simd } from 'wasm-feature-detect';
import type { WhisperWasmModule } from './types';
import wasmScriptUrl from '@wasm/libmain.js?url'

declare global {
  interface Window {
    Module: WhisperWasmModule;
    WhisperWasmService: WhisperWasmService;
  }
}
const defaultOptions = {
  language: 'auto',
  threads: 4,
  translate: false,
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface TranscribeEvent extends Event {
  detail: string;
}

type TranscribeEventType = 'system_info' | 'transcribe' | 'transcribeError';

class Bus extends EventTarget {
  on(type: TranscribeEventType, handler: (event: TranscribeEvent) => void) {
    this.addEventListener(type, handler as EventListener);
    return () => this.removeEventListener(type, handler as EventListener);
  }
  emit(type: TranscribeEventType, detail: any) {
    this.dispatchEvent(new CustomEvent(type, { detail }) as TranscribeEvent);
  }
}


export class WhisperWasmService {
  private wasmModule: WhisperWasmModule | null = null;
  private instance: number | null = null;
  private modelFileName: string = 'whisper.bin';
  private isTranscribing: boolean = false;
  private bus = new Bus();

  constructor() {}

  async checkWasmSupport(): Promise<boolean> {
    return await simd();
  }

  async loadWasmScript(): Promise<void> {
    this.wasmModule = (await import('@wasm/libmain.mjs')).default;
  }

  async loadWasmScriptUnsafe(): Promise<void> {
    if (!document) {
      throw new Error('');
    }

    const script = document.createElement('script');
    script.src = wasmScriptUrl;
    script.async = true;
    // script.onerror = () => {throw new Error('Failed to load WASM script')};

    // @ts-ignore
    window.Module = {
      print: (e: string) => {
        if (e.startsWith('[')) {
          this.bus.emit('transcribe', e);
        } else {
          this.bus.emit('system_info', e);
        }
      },
      printErr: (e: string) => {
        this.bus.emit('transcribeError', e);
      }
    }
    
    document.head.appendChild(script);
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });
    this.wasmModule = window.Module;
  }

  async loadWasmModule(model: Uint8Array): Promise<void> {
    if (!(await this.checkWasmSupport())) {
      throw new Error('WASM is not supported');
    }

    if (!this.wasmModule) {
      await this.loadWasmScript();
    }

    await sleep(100);

    this.storeFS(this.modelFileName, model);
    this.instance = this.wasmModule!.init(this.modelFileName);

    return Promise.resolve();
  }

  /**
   * @deprecated
   */
  async loadWasmModuleByUrl(modelUrl: string) {
    try {
      const arrayBuffer = await fetch(modelUrl).then((response) => response.arrayBuffer());
      this.loadWasmModule(new Uint8Array(arrayBuffer));
    } catch (error) {
      console.error(error);
      throw new Error('Failed to load WASM module');
    }
  }

  storeFS(fname: string, buf: Uint8Array) {
    if (!this.wasmModule) {
      throw new Error('WASM module not loaded');
    }
    // write to WASM file using FS_createDataFile
    // if the file exists, delete it
    try {
      this.wasmModule.FS_unlink(fname);
    } catch (e) {
      // ignore
      console.info(e);
    }

    this.wasmModule.FS_createDataFile('/', fname, buf, true, true, true);
  }

  async transcribe(
    audioData: Float32Array,
    callback: (transcription: string) => void,
    options: typeof defaultOptions = defaultOptions
  ): Promise<void> {
    if (this.isTranscribing) {
      throw new Error('Already transcribing');
    }
    if (!this.wasmModule) {
      throw new Error('WASM module not loaded');
    }
    if (!this.instance) {
      throw new Error('WASM instance not loaded');
    }

    this.isTranscribing = true;

    const { language, threads, translate } = { ...defaultOptions, ...options };
    const unsubscribe = this.bus.on('transcribe', (e) => {
      console.log('transcribe', e.detail);
      callback('test');
    });
    const unsubscribeError = this.bus.on('transcribeError', () => {
      this.isTranscribing = false;
      unsubscribe();
      unsubscribeError();
    });


    this.wasmModule.full_default(this.instance, audioData, language, threads, translate);
  }
}

window.WhisperWasmService = new WhisperWasmService();





