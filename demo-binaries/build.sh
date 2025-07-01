#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Building demo binaries..."

# Create bin directories if they don't exist
mkdir -p bin/{x86_64,aarch64,riscv64}

# Build C programs
echo "Building C programs..."

# hello.c
echo "  Building hello..."
gcc -static src/hello.c -o bin/x86_64/hello
aarch64-linux-gnu-gcc -static src/hello.c -o bin/aarch64/hello
riscv64-linux-gnu-gcc -static src/hello.c -o bin/riscv64/hello

# fibonacci.c  
echo "  Building fibonacci..."
gcc -static src/fibonacci.c -o bin/x86_64/fibonacci
aarch64-linux-gnu-gcc -static src/fibonacci.c -o bin/aarch64/fibonacci
riscv64-linux-gnu-gcc -static src/fibonacci.c -o bin/riscv64/fibonacci

# Build Rust program
echo "Building Rust program..."
echo "  Building counter..."

# For x86_64 (native)
rustc --edition 2021 src/counter.rs -o bin/x86_64/counter

# For aarch64
rustc --edition 2021 --target aarch64-unknown-linux-gnu src/counter.rs -o bin/aarch64/counter -C linker=aarch64-linux-gnu-gcc

# For riscv64
rustc --edition 2021 --target riscv64gc-unknown-linux-gnu src/counter.rs -o bin/riscv64/counter -C linker=riscv64-linux-gnu-gcc

echo "Build complete!"
echo "Generated binaries:"
find bin -type f -exec ls -lh {} \;