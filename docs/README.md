# himmel

Rust CLI tool for analyzing ELF binaries (DWARF info), WebAssembly-ready

## Overview

This tool analyzes ELF binaries, extracting basic ELF information and detailed debug information using DWARF parsing. The logic is structured in a library crate (`lib.rs`) so that WebAssembly bindings can be easily used. CLI is implemented in `src/main.rs`. No external dependencies (like gdb) are required; this uses goblin for ELF parsing and serde for output.

**🌐 [Try the Web Interface](https://wipeseals.github.io/himmel/)** - Analyze files directly in your browser using WebAssembly!

## Features

- **Parse ELF file**: show architecture, entry point, section names, file type, endianness
- **Extract DWARF debug information**: detailed function signatures, variable information, and complete type definitions
- **Output results as prettified JSON** (for easy piping or Web UI integration)
- **Structure is future-proof** for additional DWARF parsing features
- **No external dependencies** - uses goblin for ELF parsing, serde for JSON output
- **Demo binaries**: Pre-compiled sample programs for testing (C, Rust) in multiple architectures (x86_64, aarch64, riscv64)
- **Modern TypeScript Web interface**: Upload files or select demo binaries for analysis with a professional UI built with modern web technologies

## Installation

### From source

```bash
git clone https://github.com/wipeseals/himmel.git
cd himmel
cargo build --release
```

The binary will be available at `target/release/himmel`.

## Usage

### Basic usage

```bash
# Analyze an ELF file
himmel --elf ./a.out
```

### Example output

```json
{
  "elf_info": {
    "architecture": "x86_64",
    "entry_point": 4096,
    "sections": [
      ".text",
      ".data",
      ".bss",
      ".rodata"
    ],
    "file_type": "executable",
    "endianness": "little_endian",
    "functions": [
      {
        "name": "main",
        "address": 4200336,
        "size": 42,
        "parameters": [
          {
            "name": "argc",
            "type_info": {
              "name": "int",
              "kind": "basic"
            }
          }
        ]
      }
    ],
    "variables": [],
    "types": []
  }
}
```

## Library Usage

The core functionality is available as a library for integration into other Rust projects or for WebAssembly bindings:

```rust
use himmel::{analyze_files, to_json};

let result = analyze_files(Some("./binary"))?;
let json_output = to_json(&result)?;
println!("{}", json_output);
```

## Architecture

- **`src/lib.rs`**: Core analysis logic, WebAssembly-ready
- **`src/main.rs`**: CLI interface using clap for argument parsing
- **`web-src/`**: Modern TypeScript web application source code
- **`docs/`**: Built web application for GitHub Pages deployment

## Web Interface Development

The web interface is built using modern TypeScript and Vite for fast development and optimized builds.

### Development Setup

```bash
# Install web dependencies
cd web-src
npm install

# Start development server
npm run dev
```

### Building for Production

```bash
# Build the web application
cd web-src
npm run build
```

The built application will be output to the `docs/` directory, ready for GitHub Pages deployment.

### Web Development Workflow

1. **Source Code**: All TypeScript source code is in `web-src/src/`
2. **Build System**: Uses Vite for fast builds and hot reloading during development
3. **TypeScript**: Fully typed codebase with strict TypeScript configuration
4. **Modular Architecture**: Component-based structure for maintainable code
5. **WASM Integration**: Proper TypeScript bindings for WebAssembly functions

## Dependencies

- `goblin`: ELF and coredump parsing
- `serde` + `serde_json`: JSON serialization
- `clap`: CLI argument parsing  
- `anyhow`: Error handling
- `wasm-bindgen`: WebAssembly bindings
- `gimli`: DWARF debugging format parser

## Development

### Testing

The project includes comprehensive unit tests covering:
- ELF file analysis with various architectures and file types
- DWARF parsing and debug information extraction
- Error handling for invalid files and missing files
- JSON serialization and data structure validation
- Integration testing with temporary test files

Run tests with:
```bash
cargo test
```

### Linting and Formatting

The project uses standard Rust tooling for code quality:
```bash
# Check formatting
cargo fmt --check

# Run linter
cargo clippy --all-targets --all-features

# Apply formatting
cargo fmt
```

For the web interface:
```bash
cd web-src

# Type checking
npm run type-check

# Linting
npm run lint
```

### Continuous Integration

GitHub Actions CI automatically runs on all pull requests and pushes to main/master:
- Code formatting checks
- Clippy linting with zero warnings policy
- Full test suite execution
- Debug and release build verification
- Web application build and deployment to GitHub Pages

## Next Steps (Future Work)

- Expand DWARF parsing (enhanced backtraces, more variable types)
- Improve type system representation
- Support for more architectures and file formats
- Enhanced Web UI features and better mobile support

## License

MIT License - see [LICENSE](LICENSE) file for details.
