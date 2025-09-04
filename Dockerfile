# Multi-stage build for whisper.wasm
FROM emscripten/emsdk:4.0.14 AS builder

# Set working directory
WORKDIR /src

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    cmake \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Clone whisper.cpp repository
RUN git clone https://github.com/ggerganov/whisper.cpp.git

WORKDIR /src/whisper.cpp
RUN mkdir build-em

WORKDIR /src/whisper.cpp/build-em

# Build whisper.wasm
RUN emcmake cmake ..

RUN make -j

# prepare for export
# docker build --target builder --output type=local,dest=./wasm-build .
WORKDIR /src/whisper.cpp/build-em

FROM scratch AS export-stage
COPY --from=builder /src/whisper.cpp/build-em/bin /
