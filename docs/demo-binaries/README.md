# Demo Binaries

This directory contains small demo programs compiled for different architectures that can be used for testing and demonstration purposes.

## Structure

- `src/` - Source code for demo programs
- `bin/` - Compiled binaries organized by architecture
- `build.sh` - Build script to cross-compile all demo programs

## Demo Programs

1. **hello** - Simple "Hello, World!" program in C
2. **counter** - Simple counter program in Rust
3. **fibonacci** - Fibonacci calculator program in C

## Architectures

- x86_64 (native)
- aarch64 (ARM64)
- riscv64 (RISC-V 64-bit)

## Usage

These binaries are used in:
- Unit tests for the himmel library
- Web interface as pre-selectable demo files
- CLI tool testing and demonstration