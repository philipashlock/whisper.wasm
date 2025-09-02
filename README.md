# Whisper WASM

WebAssembly bindings for OpenAI Whisper speech recognition.

## Features

- 🎤 High-quality speech recognition using OpenAI Whisper
- ⚡ WebAssembly for fast performance in browsers
- 🌍 Multi-language support with auto-detection
- 🔄 Translation capabilities
- 📱 Works in modern browsers and Node.js
- 🧠 Support for different Whisper model sizes

## Installation

```bash
npm install whisper.wasm
```

## Quick Start

```typescript
import { WhisperWasmService } from "whisper.wasm";

const whisper = new WhisperWasmService();

// Check WASM support
const isSupported = await whisper.checkWasmSupport();

// Load model
const modelData = new Uint8Array(/* your model file */);
await whisper.loadWasmModule(modelData);

// Transcribe audio
const audioData = new Float32Array(/* your audio data */);
const result = whisper.transcribe(audioData, "en", 4, false);
console.log(result);
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
git clone <repository-url>
cd whisper.wasm
npm install
```

### Build Library

```bash
npm run build:lib
```

### Run Demo

```bash
npm run dev:demo
```

### Build Demo

```bash
npm run build:demo
```

## API Reference

### WhisperWasmService

#### `checkWasmSupport(): Promise<boolean>`

Checks if WebAssembly is supported in the current environment.

#### `loadWasmModule(model: Uint8Array): Promise<void>`

Loads a Whisper model from binary data.

#### `transcribe(audioData: Float32Array, language?: string, threads?: number, translate?: boolean): string`

Transcribes audio data to text.

**Parameters:**

- `audioData`: Audio data as Float32Array
- `language`: Language code (default: 'auto')
- `threads`: Number of threads to use (default: 4)
- `translate`: Whether to translate to English (default: false)

## Demo

The project includes an interactive demo that you can run locally:

```bash
npm run dev:demo
```

The demo provides:

- Audio file upload
- Model loading
- Real-time transcription
- Language selection
- Translation options

## Browser Support

- Chrome 57+
- Firefox 52+
- Safari 11+
- Edge 16+

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgments

- [OpenAI Whisper](https://github.com/openai/whisper) - The original speech
  recognition model
- [Emscripten](https://emscripten.org/) - WebAssembly compilation
