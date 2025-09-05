#!/bin/bash

# Build whisper.wasm using Docker
echo "Building whisper.wasm with Docker..."

echo "remove all js files"
rm -rf ./wasm

# Build the Docker image
docker build --target export-stage --progress=plain --output type=local,dest=./wasm -t  whisper-wasm-builder . 

echo "fix worker import path"

for file in ./wasm/*.js; do
  filename=$(basename "$file")
  echo $filename
  node -e "
const fs = require('fs');
const content = fs.readFileSync('$file', 'utf8');
fs.writeFileSync('$file', content.replace(/$filename/g, ''));
"
done

echo "Build complete! WASM files are in ./wasm directory"
