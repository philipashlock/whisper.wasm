
import { simd } from 'wasm-feature-detect';
import type { WhisperWasmModule } from './types';

declare global {
  interface Window {
    Module: WhisperWasmModule;
    WhisperWasmService: WhisperWasmService;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class WhisperWasmService {
  private wasmModule: WhisperWasmModule | null = null;
  private instance: number | null = null;
  private modelFileName: string = 'whisper.bin';

  constructor() {}

  async checkWasmSupport(): Promise<boolean> {
    return await simd();
  }

  async loadWasmScript(): Promise<void> {
    this.wasmModule = (await import('@wasm/libmain.js')).default;
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

  transcribe(
    audioData: Float32Array,
    language: string = 'auto',
    threads: number = 4,
    translate: boolean = false,
  ): string {
    if (!this.wasmModule) {
      throw new Error('WASM module not loaded');
    }
    if (!this.instance) {
      throw new Error('WASM instance not loaded');
    }
    return this.wasmModule.full_default(this.instance, audioData, language, threads, translate);
  }
}

window.WhisperWasmService = new WhisperWasmService();
