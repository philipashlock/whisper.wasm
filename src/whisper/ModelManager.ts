import { getAllModels, getModelConfig, ModelID, WhisperModel } from './ModelConfig';
import { Logger, LoggerLevelsType } from '../utils/Logger';

export interface ModelListConfig {
  models: WhisperModel[];
  cacheEnabled?: boolean;
  maxCacheSize?: number; // в байтах
}

export interface ProgressCallback {
  (progress: number): void;
}

export interface ModelManagerOptions {
  logLevel: LoggerLevelsType;
}

export class ModelManager {
  private cacheEnabled: boolean = true;
  private models = getAllModels();
  private logger: Logger;

  constructor(options: ModelManagerOptions = { logLevel: Logger.levels.ERROR }) {
    this.logger = new Logger(options.logLevel, 'ModelManager');
  }

  /**
   * Загружает модель по имени
   */
  async loadModel(
    modelId: ModelID, 
    saveToIndexedDB: boolean = true, 
    progressCallback?: ProgressCallback
  ): Promise<Uint8Array> {
    const model = getModelConfig(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found in config`);
    }

    // Проверяем кэш в IndexedDB
    if (this.cacheEnabled && saveToIndexedDB) {
      const cachedModel = await this.getCachedModel(modelId);
      if (cachedModel) {
        this.logger.info(`Model ${modelId} loaded from cache`);
        if (progressCallback) progressCallback(100);
        return cachedModel;
      }
    }

    // Загружаем модель по URL
    this.logger.info(`Loading model ${modelId} from ${model.url}`);
    const response = await fetch(model.url);
    if (!response.ok) {
      throw new Error(`Failed to load model: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const chunks: Uint8Array[] = [];
    
    try {
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        
        if (!done && result.value) {
          chunks.push(result.value);
          loaded += result.value.length;
          
          if (progressCallback && total > 0) {
            const progress = Math.round((loaded / total) * 100);
            progressCallback(progress);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Объединяем все чанки в один массив
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const modelData = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      modelData.set(chunk, offset);
      offset += chunk.length;
    }

    // Сохраняем в IndexedDB если нужно
    if (this.cacheEnabled && saveToIndexedDB) {
      await this.saveModelToCache(modelId, modelData);
    }

    if (progressCallback) progressCallback(100);
    return modelData;
  }

  /**
   * Загружает WASM-модель по URL и сохраняет её в IndexedDB, используя сам URL в качестве ключа.
   */
  async loadModelByUrl(modelUrl: string, progressCallback?: ProgressCallback): Promise<Uint8Array> {
    try {
      // Сначала пробуем получить из кэша по URL
      if (this.cacheEnabled) {
        const cached = await this.getCachedModelByUrl(modelUrl);
        if (cached) {
          this.logger.info(`WASM module loaded from cache by URL: ${modelUrl}`);
          if (progressCallback) progressCallback(100);
          return cached;
        }
      }

      // Если нет в кэше, загружаем по сети
      this.logger.info(`Loading WASM module from URL: ${modelUrl}`);
      const response = await fetch(modelUrl);
      if (!response.ok) {
        throw new Error(`Failed to load WASM module: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const chunks: Uint8Array[] = [];
      
      try {
        let done = false;
        while (!done) {
          const result = await reader.read();
          done = result.done;
          
          if (!done && result.value) {
            chunks.push(result.value);
            loaded += result.value.length;
            
            if (progressCallback && total > 0) {
              const progress = Math.round((loaded / total) * 100);
              progressCallback(progress);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Объединяем все чанки в один массив
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const modelData = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        modelData.set(chunk, offset);
        offset += chunk.length;
      }

      // Сохраняем в кэш по URL
      if (this.cacheEnabled) {
        await this.saveModelToCacheByUrl(modelUrl, modelData);
      }

      if (progressCallback) progressCallback(100);
      return modelData;
    } catch (error) {
      this.logger.error(error);
      throw new Error('Failed to load WASM module');
    }
  }

  /**
   * Получить модель из IndexedDB по URL (ключ — сам URL)
   */
  private async getCachedModelByUrl(modelUrl: string): Promise<Uint8Array | null> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['modelsByUrl'], 'readonly');
      const store = transaction.objectStore('modelsByUrl');
      
      return new Promise<Uint8Array | null>((resolve, reject) => {
        const request = store.get(modelUrl);
        
        request.onsuccess = () => {
          const result = request.result;
          if (result && result.data) {
            resolve(result.data);
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      this.logger.error('Error reading model from cache by URL:', error);
      return null;
    }
  }

  /**
   * Сохраняет модель в IndexedDB по URL (ключ — сам URL)
   */
  private async saveModelToCacheByUrl(modelUrl: string, modelData: Uint8Array): Promise<void> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['modelsByUrl'], 'readwrite');
      const store = transaction.objectStore('modelsByUrl');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          url: modelUrl,
          data: modelData,
          timestamp: Date.now(),
          size: modelData.length
        });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      this.logger.info(`Model saved to cache by URL: ${modelUrl}`);
    } catch (error) {
      this.logger.error('Error saving model to cache by URL:', error);
    }
  }

  /**
   * Получает список доступных моделей с информацией о кэше
   */
  async getAvailableModels(): Promise<WhisperModel[]> {
    const models = [...this.models];
    
    if (!this.cacheEnabled) {
      return models;
    }

    try {
      // Получаем список загруженных моделей из IndexedDB
      const cachedModels = await this.getCachedModelNames();
      
      // Обогащаем массив моделей информацией о кэше
      return models.map(model => ({
        ...model,
        cached: cachedModels.includes(model.id)
      }));
    } catch (error) {
      this.logger.error('Error checking cache status:', error);
      return models;
    }
  }

  /**
   * Получает список доступных моделей без проверки кэша (синхронно)
   */
  getAvailableModelsSync(): WhisperModel[] {
    return [...this.models];
  }

  /**
   * Получает модель по имени из конфига
   */
  getModelConfig(modelName: ModelID): WhisperModel | undefined {
    return getModelConfig(modelName);
  }

  /**
   * Сохраняет модель в IndexedDB
   */
  private async saveModelToCache(modelName: ModelID, modelData: Uint8Array): Promise<void> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['models'], 'readwrite');
      const store = transaction.objectStore('models');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          name: modelName,
          data: modelData,
          timestamp: Date.now(),
          size: modelData.length
        });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      this.logger.info(`Model ${modelName} saved to cache`);
    } catch (error) {
      this.logger.error('Error saving model to cache:', error);
    }
  }

  /**
   * Получает модель из кэша IndexedDB
   */
  private async getCachedModel(modelName: ModelID): Promise<Uint8Array | null> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      
      return new Promise<Uint8Array | null>((resolve, reject) => {
        const request = store.get(modelName);
        
        request.onsuccess = () => {
          const result = request.result;
          if (result && result.data) {
            resolve(result.data);
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      this.logger.error('Error getting cached model:', error);
      return null;
    }
  }

  /**
   * Получает список имен моделей, загруженных в кэш
   */
  private async getCachedModelNames(): Promise<ModelID[]> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      
      return new Promise<ModelID[]>((resolve, reject) => {
        const request = store.getAllKeys();
        
        request.onsuccess = () => {
          const keys = request.result as ModelID[];
          resolve(keys);
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      this.logger.error('Error getting cached model names:', error);
      return [];
    }
  }

  /**
   * Открывает IndexedDB для кэширования моделей
   */
  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WhisperModels', 2);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Создаем object store для моделей по ID
        if (!db.objectStoreNames.contains('models')) {
          const store = db.createObjectStore('models', { keyPath: 'name' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('size', 'size', { unique: false });
        }
        
        // Создаем object store для моделей по URL
        if (!db.objectStoreNames.contains('modelsByUrl')) {
          const store = db.createObjectStore('modelsByUrl', { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('size', 'size', { unique: false });
        }
      };
    });
  }

  /**
   * Очищает кэш моделей
   */
  async clearCache(): Promise<void> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['models', 'modelsByUrl'], 'readwrite');
      
      // Очищаем store для моделей по ID
      const modelsStore = transaction.objectStore('models');
      await new Promise<void>((resolve, reject) => {
        const request = modelsStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      // Очищаем store для моделей по URL
      const modelsByUrlStore = transaction.objectStore('modelsByUrl');
      await new Promise<void>((resolve, reject) => {
        const request = modelsByUrlStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      this.logger.info('Model cache cleared');
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
    }
  }

  /**
   * Получает информацию о кэше
   */
  async getCacheInfo(): Promise<{ count: number; totalSize: number }> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = () => {
          const models = request.result;
          const totalSize = models.reduce((sum, model) => sum + (model.size || 0), 0);
          resolve({ count: models.length, totalSize });
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      this.logger.error('Error getting cache info:', error);
      return { count: 0, totalSize: 0 };
    }
  }
}
