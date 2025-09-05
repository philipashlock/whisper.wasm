type WithPrefix<T, P extends string> = {
  [K in keyof T as K extends string ? `${P}${K}` : never]: T[K];
};

// Интерфейс для whisper.cpp WASM модуля
export interface WhisperWasmModule extends WithPrefix<typeof FS, 'FS_'> {
  init: (modelPath: string) => number;
  // init: typeof FS.init;
  full_default: (
    instance: number,
    audio: Float32Array,
    language: string,
    threads: number,
    translate: boolean,
  ) => string;
  print: (e: string) => void
  printErr: (e: string) => void
  free: () => void
  // Другие методы модуля;
}

// Статус загрузки WASM модуля
export interface WasmModuleStatus {
  wasmLoaded: boolean;
  modelLoaded: boolean;
  instance: number | null;
  currentModel: string | null;
}
