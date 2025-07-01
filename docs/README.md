# Himmel Web Interface

A modern web interface for analyzing ELF binaries and coredump files, powered by WebAssembly.

## Features

- **File Upload**: Support for both dialog-based file selection and drag & drop
- **WebAssembly**: Runs entirely in the browser without server-side processing
- **Modern UI**: Clean, responsive design built with Tailwind CSS
- **Same Functionality**: Provides the same analysis capabilities as the CLI tool
- **Offline Capable**: Works without internet connection after initial load

## Usage

1. Open the web interface at [GitHub Pages URL]
2. Upload an ELF binary file (required)
3. Optionally upload a coredump file
4. Click "Analyze Files" to see the results

## Supported File Types

- **ELF Binaries**: Executable files, shared libraries, object files
- **Coredumps**: Linux core dump files
- **Maximum file size**: 10MB per file

## Analysis Results

The web interface displays:
- Architecture information
- Entry point addresses
- Section names and information
- File type and endianness
- Thread information (for coredumps)
- Raw JSON output for programmatic use

## Technical Details

- Built with Rust and compiled to WebAssembly using wasm-pack
- Uses wasm-bindgen for JavaScript interoperability
- Styled with Tailwind CSS for modern appearance
- Deployed automatically via GitHub Actions to GitHub Pages