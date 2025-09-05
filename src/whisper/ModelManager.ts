import type { WhisperWasmService } from './WhisperWasmService';
import { getAllModels, getModelConfig, ModelID, WhisperModel } from './ModelConfig';

export interface ModelListConfig {
  models: WhisperModel[];
  cacheEnabled?: boolean;
  maxCacheSize?: number; // в байтах
}

export class ModelManager {
  private cacheEnabled: boolean = true;
  private models = getAllModels();

  /**
   * Загружает модель по имени
   */
  async loadModel(modelId: ModelID, saveToIndexedDB: boolean = true): Promise<Uint8Array> {
    const model = getModelConfig(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found in config`);
    }

    // Проверяем кэш в IndexedDB
    if (this.cacheEnabled && saveToIndexedDB) {
      const cachedModel = await this.getCachedModel(modelId);
      if (cachedModel) {
        console.log(`Model ${modelId} loaded from cache`);
        return cachedModel;
      }
    }

    // Загружаем модель по URL
    console.log(`Loading model ${modelId} from ${model.url}`);
    const response = await fetch(model.url);
    if (!response.ok) {
      throw new Error(`Failed to load model: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const modelData = new Uint8Array(arrayBuffer);

    // Сохраняем в IndexedDB если нужно
    if (this.cacheEnabled && saveToIndexedDB) {
      await this.saveModelToCache(modelId, modelData);
    }

    return modelData;
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
      console.error('Error checking cache status:', error);
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
      
      console.log(`Model ${modelName} saved to cache`);
    } catch (error) {
      console.error('Error saving model to cache:', error);
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
      console.error('Error getting cached model:', error);
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
      console.error('Error getting cached model names:', error);
      return [];
    }
  }

  /**
   * Открывает IndexedDB для кэширования моделей
   */
  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WhisperModels', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('models')) {
          const store = db.createObjectStore('models', { keyPath: 'name' });
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
      const transaction = db.transaction(['models'], 'readwrite');
      const store = transaction.objectStore('models');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      console.log('Model cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
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
      console.error('Error getting cache info:', error);
      return { count: 0, totalSize: 0 };
    }
  }
}