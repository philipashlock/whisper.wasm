const fs = require('fs');
const path = require('path');

// Копируем WASM файлы в dist папку
function copyWasmFiles() {
  const wasmDir = path.join(__dirname, '../wasm');
  const distDir = path.join(__dirname, '../dist');
  
  // Создаем dist папку если её нет
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  // Копируем все .js файлы из wasm папки
  const files = fs.readdirSync(wasmDir);
  
  files.forEach(file => {
    if (file.endsWith('.js')) {
      const srcPath = path.join(wasmDir, file);
      const destPath = path.join(distDir, file);
      
      console.log(`Copying ${file} to dist/`);
      fs.copyFileSync(srcPath, destPath);
    }
  });
  
  console.log('WASM files copied successfully!');
}

copyWasmFiles();
