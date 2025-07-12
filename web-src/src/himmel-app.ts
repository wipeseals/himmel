import { AppState, AnalysisResult } from './types';
import { DemoSection } from './demo-section';
import { UploadSection } from './upload-section';
import { ResultsRenderer } from './results-renderer';

declare global {
  interface Window {
    initWasm: () => Promise<any>;
    analyze_files_wasm: (elfData: Uint8Array | null) => string;
  }
}

export class HimmelApp {
  private state: AppState = {
    wasmModule: null,
    elfFile: null,
    isLoading: false,
    error: null,
    results: null
  };

  private demoSection!: DemoSection;
  private uploadSection!: UploadSection;
  private resultsRenderer!: ResultsRenderer;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      // Wait for WASM module to be available
      while (!window.initWasm) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      this.state.wasmModule = await window.initWasm();
      this.setupComponents();
      console.log('Himmel WebAssembly module loaded successfully');
    } catch (error) {
      console.error('Failed to load WebAssembly module:', error);
      this.showError('Failed to load WebAssembly module. Please refresh the page.');
    }
  }

  private setupComponents(): void {
    // Initialize components
    const demoContainer = document.getElementById('demo-section')!;
    const uploadContainer = document.getElementById('upload-section')!;
    const resultsContainer = document.getElementById('results-content')!;

    this.demoSection = new DemoSection(demoContainer, this.handleDemoBinarySelect.bind(this));
    this.uploadSection = new UploadSection(uploadContainer, this.handleFileSelect.bind(this));
    this.resultsRenderer = new ResultsRenderer(resultsContainer);

    // Attach analyze button handler
    const analyzeBtn = this.uploadSection.getAnalyzeButton();
    analyzeBtn.addEventListener('click', () => {
      this.analyzeFiles();
    });
  }

  private async handleDemoBinarySelect(program: string, arch: string): Promise<void> {
    try {
      // Fetch the demo binary
      const response = await fetch(`demo-binaries/bin/${arch}/${program}`);
      if (!response.ok) {
        throw new Error(`Failed to load demo binary: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      
      // Create a File-like object from the binary data
      const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
      const file = new File([blob], `${program}-${arch}`, { type: 'application/octet-stream' });

      this.state.elfFile = file;
      this.uploadSection.updateAnalyzeButton(true);
      
    } catch (error) {
      this.showError(`Failed to load demo binary: ${(error as Error).message}`);
      throw error;
    }
  }

  private handleFileSelect(file: File): void {
    this.state.elfFile = file;
    this.uploadSection.updateAnalyzeButton(true);
  }

  private async analyzeFiles(): Promise<void> {
    if (!this.state.wasmModule) {
      this.showError('WebAssembly module not loaded');
      return;
    }

    this.showLoading(true);
    this.hideError();
    this.hideResults();

    try {
      let elfData: Uint8Array | null = null;

      // Read ELF file if provided
      if (this.state.elfFile) {
        elfData = new Uint8Array(await this.state.elfFile.arrayBuffer());
      }

      // Call WebAssembly function
      const result = window.analyze_files_wasm(elfData);
      
      // Parse result
      const analysisResult: AnalysisResult = JSON.parse(result);
      
      if (analysisResult.error) {
        throw new Error(analysisResult.error);
      }

      this.state.results = analysisResult;
      this.showResults(analysisResult);
      
    } catch (error) {
      console.error('Analysis error:', error);
      this.showError(`Analysis failed: ${(error as Error).message}`);
    } finally {
      this.showLoading(false);
    }
  }

  private showLoading(show: boolean): void {
    this.state.isLoading = show;
    const loading = document.getElementById('loading')!;
    if (show) {
      loading.classList.remove('hidden');
    } else {
      loading.classList.add('hidden');
    }
  }

  private showError(message: string): void {
    this.state.error = message;
    const errorDiv = document.getElementById('error')!;
    const errorContent = document.getElementById('error-content')!;
    errorContent.textContent = message;
    errorDiv.classList.remove('hidden');
  }

  private hideError(): void {
    this.state.error = null;
    document.getElementById('error')!.classList.add('hidden');
  }

  private showResults(results: AnalysisResult): void {
    const resultsDiv = document.getElementById('results')!;
    this.resultsRenderer.render(results);
    resultsDiv.classList.remove('hidden');
  }

  private hideResults(): void {
    this.state.results = null;
    document.getElementById('results')!.classList.add('hidden');
  }
}