#!/bin/bash

# Build whisper.wasm using Docker
echo "Building whisper.wasm with Docker..."

echo "remove all js files"
rm -rf ./wasm

# Build the Docker image
docker build --target export-stage --progress=plain --output type=local,dest=./wasm -t  whisper-wasm-builder . 


# Note: It is recommended to use specific Emscripten build flags to generate ES6 modules directly,
# such as -sEXPORT_ES6=1 and -sMODULARIZE=1. Consider updating the build process to use these options.
# TODO: Refactor the build to output ES6 modules from Emscripten instead of wrapping manually.

echo "convert js files to modules"

for file in ./wasm/*.js; do
  echo "export default (function() {" > $file.tmp
  cat $file >> $file.tmp
  echo "return Module;})();" >> $file.tmp
  mv $file.tmp $file
  echo "$file converted"
done

echo "Build complete! WASM files are in ./wasm directory"
