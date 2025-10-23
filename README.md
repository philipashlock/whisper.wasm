# Whisper.wasm

A TypeScript wrapper for [whisper.cpp](https://github.com/ggml-org/whisper.cpp) that brings OpenAI's Whisper speech recognition to the browser and Node.js using WebAssembly.

## Features

- 🎤 **High-quality speech recognition** using OpenAI Whisper models
- ⚡ **WebAssembly performance** - runs directly in the browser
- 🌍 **Multi-language support** with automatic language detection
- 🔄 **Translation capabilities** - translate speech to English
- 📱 **Cross-platform** - works in browsers and Node.js
- 🧠 **Multiple model sizes** - from tiny to large models
- 🎯 **Streaming transcription** - real-time audio processing
- 📦 **Zero dependencies** - no external libraries required

## Installation

### From npm

```bash
npm install @timur00kh/whisper.wasm@canary
```

### From GitHub (philipashlock fork)

```bash
npm install github:philipashlock/whisper.wasm#main
```

Or in your `package.json`:

```json
{
  "dependencies": {
    "@timur00kh/whisper.wasm": "github:philipashlock/whisper.wasm#v0.0.8"
  }
}
```

## Quick Start

### Basic Usage

```typescript
import { WhisperWasmService, ModelManager } from '@timur00kh/whisper.wasm';

// Initialize the service
const whisper = new WhisperWasmService({ logLevel: 1 });
const modelManager = new ModelManager();

// Check WASM support
const isSupported = await whisper.checkWasmSupport();
if (!isSupported) {
  throw new Error('WebAssembly is not supported');
}

// Load a model
const modelData = await modelManager.loadModel('base'); // or 'tiny', 'small', 'medium', 'large'
await whisper.initModel(modelData);

// Create a transcription session for streaming
const session = whisper.createSession();

// Process audio in chunks
const stream = session.streaming(audioData, {
  language: 'en',
  threads: 4,
  translate: false,
  sleepMsBetweenChunks: 100,
});

for await (const segment of stream) {
  console.log(`[${segment.timeStart}ms - ${segment.timeEnd}ms]: ${segment.text}`);
}
```

### Model Management

```typescript
import { ModelManager, getAllModels } from '@timur00kh/whisper.wasm';

const modelManager = new ModelManager();

// Get available models
const availableModels = await modelManager.getAvailableModels();
console.log(availableModels);

// Or use the synchronous version
const allModels = getAllModels();

// Load a specific model
const modelData = await modelManager.loadModel('base', true, (progress) => {
  console.log(`Loading progress: ${progress}%`);
});

// Clear cache
await modelManager.clearCache();
```

## API Reference

### WhisperWasmService

Main service class for speech recognition.

#### Constructor

```typescript
new WhisperWasmService(options?: {
  logLevel?: LoggerLevelsType;
  init?: boolean;
})
```

#### Methods

##### `checkWasmSupport(): Promise<boolean>`

Checks if WebAssembly is supported in the current environment.

##### `initModel(model: Uint8Array): Promise<void>`

Loads a Whisper model from binary data.

**Parameters:**

- `model`: Model data as Uint8Array

##### `transcribe(audioData: Float32Array, callback?: WhisperWasmServiceCallback, options?: WhisperWasmTranscriptionOptions): Promise<TranscriptionResult>`

Transcribes audio data to text.

**Parameters:**

- `audioData`: Audio data as Float32Array (16kHz sample rate)
- `callback`: Optional callback function called for each transcribed segment
- `options`: Transcription options (optional)

**Returns:**

```typescript
{
  segments: WhisperWasmServiceCallbackParams[];
  transcribeDurationMs: number;
}
```

##### `createSession(): TranscriptionSession`

Creates a new transcription session for streaming audio.

### ModelManager

Manages Whisper model loading and caching.

#### Methods

##### `getAvailableModels(): Promise<ModelInfo[]>`

Returns information about available models.

##### `loadModel(modelId: string, useCache?: boolean, onProgress?: (progress: number) => void): Promise<Uint8Array>`

Loads a model by ID.

**Parameters:**

- `modelId`: Model identifier ('tiny', 'base', 'small', 'medium', 'large')
- `useCache`: Whether to use cached model if available
- `onProgress`: Progress callback function

##### `clearCache(): Promise<void>`

Clears the model cache.

### TranscriptionSession

Handles streaming audio transcription.

#### Methods

##### `streaming(audioData: Float32Array, options?: ITranscriptionSessionOptions): AsyncIterableIterator<WhisperWasmServiceCallbackParams>`

Processes audio data in streaming fashion.

## Supported Models

| Model  | Size     | Memory | Speed | Quality |
| ------ | -------- | ------ | ----- | ------- |
| tiny   | ~39 MB   | ~1 GB  | ~32x  | ~99%    |
| base   | ~74 MB   | ~1 GB  | ~16x  | ~99%    |
| small  | ~244 MB  | ~2 GB  | ~6x   | ~99%    |
| medium | ~769 MB  | ~5 GB  | ~2x   | ~99%    |
| large  | ~1550 MB | ~10 GB | ~1x   | ~99%    |

## Browser Support

- **Chrome**: 57+
- **Firefox**: 52+
- **Safari**: 11+
- **Edge**: 16+

## FAQ

### Q: Why is my transcription stopping unexpectedly?

A: This is usually related to WebAssembly execution being terminated by the browser due to resource management policies, low battery, or background tab throttling. Use the `restartModelOnError: true` option to automatically restart the model when this happens.

### Q: Can I use this in a background tab?

A: Some browsers may throttle or pause WebAssembly execution in background tabs. Consider using the `restartModelOnError` option and implementing visibility change listeners to handle this.

### Q: Why is the first transcription slower?

A: The first transcription includes model initialization time. Subsequent transcriptions with the same model will be faster.

### Q: Can I transcribe audio in real-time?

A: Yes! Use the `TranscriptionSession` with streaming audio data. For real-time applications, consider using the `tiny` or `base` models for better performance.

### Q: What audio formats are supported?

A: The library works with `Float32Array` audio data at 16kHz sample rate. You'll need to convert your audio files to this format before processing.

### Q: How do I handle errors gracefully?

A: Use try-catch blocks around transcription calls and implement the `restartModelOnError` option for automatic recovery from WebAssembly execution issues.

## Demo

Try the interactive demo:

**Live Demo:** https://timur00kh.github.io/whisper.wasm/

**Source Code:** [demo/index.html](demo/index.html)

**Local Development:**

```bash
npm run dev:demo
```

The demo includes:

- Audio file upload and processing
- Model selection and loading
- Real-time transcription with progress
- Language detection and translation
- Streaming audio support

## Changelog

For detailed information about changes, new features, and bug fixes, see our [changelog documentation](docs/changelog/).

### Recent Updates

- **[feature-restart-on-timeout](docs/changelog/feature-restart-on-timeout.md)** - Added timeout handling, error recovery, and enhanced demo application

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker (only for rebuilding WASM binaries)

### Setup

```bash
git clone https://github.com/philipashlock/whisper.wasm.git
cd whisper.wasm
npm install
```

### Build Workflow

This package uses a two-stage build process:

#### Stage 1: WASM Compilation (Infrequent)

**Only needed when:**
- Updating whisper.cpp version
- Modifying WASM compilation flags
- Building from scratch for the first time

```bash
# Requires Docker
./build-wasm.sh
```

This script:
- Detects your platform (ARM64/AMD64)
- Runs Docker container with Emscripten
- Compiles whisper.cpp to WebAssembly
- Outputs to `wasm/` directory (~10MB)
- The `wasm/` directory IS committed to git

**Note:** The build script automatically detects macOS ARM64 architecture and sets the correct Docker platform.

#### Stage 2: TypeScript Library Build (Frequent)

**Needed when:**
- Modifying TypeScript wrapper code
- Publishing updates
- Installing from GitHub

```bash
# Build the library
npm run build:lib

# Or just run install (triggers prepare script)
npm install
```

This:
- Bundles TypeScript code with Vite
- Includes WASM files as assets
- Outputs to `dist/` directory (~4MB)
- The `dist/` directory is NOT committed to git

### Repository Structure

```
whisper.wasm/
├── wasm/              # ✅ COMMITTED - Pre-built WASM binaries
│   ├── libmain.js     # Main whisper module
│   ├── libstream.js   # Streaming module
│   └── ...
├── dist/              # ❌ IGNORED - Built library (auto-generated)
│   ├── index.es.js
│   ├── index.cjs.js
│   └── ...
├── src/               # TypeScript wrapper source
├── Dockerfile         # Multi-platform WASM build
└── build-wasm.sh      # Platform-aware build script
```

### Development Workflows

#### Working on the Library

```bash
# One-time WASM build (or when updating whisper.cpp)
./build-wasm.sh

# Rebuild TypeScript after changes
npm run build:lib

# Run tests
npm test

# Run demo locally
npm run dev:demo
```

#### Using Library in Another Project Locally

```bash
# In this library directory
npm link

# In your app directory (e.g., whisper-wasm React app)
npm link @timur00kh/whisper.wasm
npm run dev
```

When done with local development:

```bash
# In your app directory
npm unlink @timur00kh/whisper.wasm
npm install  # Reinstalls from GitHub
```

#### Installing from GitHub in Production

When you run `npm install` with the GitHub dependency:

```json
"@timur00kh/whisper.wasm": "github:philipashlock/whisper.wasm#main"
```

npm will:
1. Clone the repository
2. Find pre-built `wasm/` files (committed)
3. Run `prepare` script → builds `dist/` from source
4. No Docker required!

### Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With UI
npm run test:ui
```

## License

MIT

## Acknowledgments

- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) - High-performance C++ implementation of Whisper
- [OpenAI Whisper](https://github.com/openai/whisper) - The original speech recognition model
- [Emscripten](https://emscripten.org/) - WebAssembly compilation toolkit

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
