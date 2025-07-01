import init, { analyze_files_wasm, analyze_elf_wasm, analyze_coredump_wasm } from './himmel.js';

class HimmelApp {
    constructor() {
        this.wasmModule = null;
        this.elfFile = null;
        this.coreFile = null;
        this.init();
    }

    async init() {
        try {
            this.wasmModule = await init();
            this.setupEventListeners();
            console.log('Himmel WebAssembly module loaded successfully');
        } catch (error) {
            console.error('Failed to load WebAssembly module:', error);
            this.showError('Failed to load WebAssembly module. Please refresh the page.');
        }
    }

    setupEventListeners() {
        // File input handlers
        document.getElementById('elf-file-upload').addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0], 'elf');
        });
        
        document.getElementById('core-file-upload').addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0], 'core');
        });

        // Drag and drop handlers
        this.setupDragAndDrop('elf-dropzone', 'elf');
        this.setupDragAndDrop('core-dropzone', 'core');

        // Analyze button
        document.getElementById('analyze-btn').addEventListener('click', () => {
            this.analyzeFiles();
        });
    }

    setupDragAndDrop(dropzoneId, fileType) {
        const dropzone = document.getElementById(dropzoneId);
        
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('border-primary', 'bg-blue-50');
        });
        
        dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropzone.classList.remove('border-primary', 'bg-blue-50');
        });
        
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('border-primary', 'bg-blue-50');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0], fileType);
            }
        });
    }

    handleFileSelect(file, fileType) {
        if (!file) return;

        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            this.showError('File size exceeds 10MB limit');
            return;
        }

        // Store file and update UI
        if (fileType === 'elf') {
            this.elfFile = file;
            this.updateFileInfo('elf', file.name, file.size);
        } else {
            this.coreFile = file;
            this.updateFileInfo('core', file.name, file.size);
        }

        this.updateAnalyzeButton();
    }

    updateFileInfo(fileType, fileName, fileSize) {
        const fileInfo = document.getElementById(`${fileType}-file-info`);
        const fileNameEl = document.getElementById(`${fileType}-file-name`);
        const fileSizeEl = document.getElementById(`${fileType}-file-size`);
        
        fileNameEl.textContent = fileName;
        fileSizeEl.textContent = `(${this.formatFileSize(fileSize)})`;
        fileInfo.classList.remove('hidden');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateAnalyzeButton() {
        const analyzeBtn = document.getElementById('analyze-btn');
        const hasFiles = this.elfFile || this.coreFile;
        analyzeBtn.disabled = !hasFiles;
    }

    async analyzeFiles() {
        if (!this.wasmModule) {
            this.showError('WebAssembly module not loaded');
            return;
        }

        this.showLoading(true);
        this.hideError();
        this.hideResults();

        try {
            let elfData = null;
            let coreData = null;

            // Read ELF file if provided
            if (this.elfFile) {
                elfData = new Uint8Array(await this.elfFile.arrayBuffer());
            }

            // Read core file if provided
            if (this.coreFile) {
                coreData = new Uint8Array(await this.coreFile.arrayBuffer());
            }

            // Call WebAssembly function
            const result = analyze_files_wasm(elfData, coreData);
            
            // Parse result
            const analysisResult = JSON.parse(result);
            
            if (analysisResult.error) {
                throw new Error(analysisResult.error);
            }

            this.showResults(analysisResult);
            
        } catch (error) {
            console.error('Analysis error:', error);
            this.showError(`Analysis failed: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('error');
        const errorContent = document.getElementById('error-content');
        errorContent.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    hideError() {
        document.getElementById('error').classList.add('hidden');
    }

    showResults(results) {
        const resultsDiv = document.getElementById('results');
        const resultsContent = document.getElementById('results-content');
        
        let html = '';

        // ELF Information
        if (results.elf_info) {
            html += this.renderElfInfo(results.elf_info);
        }

        // Coredump Information
        if (results.coredump_info) {
            html += this.renderCoredumpInfo(results.coredump_info);
        }

        // Raw JSON
        html += this.renderRawJson(results);

        resultsContent.innerHTML = html;
        resultsDiv.classList.remove('hidden');
    }

    hideResults() {
        document.getElementById('results').classList.add('hidden');
    }

    renderElfInfo(elfInfo) {
        return `
            <div class="mb-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">ELF Binary Information</h3>
                <div class="bg-gray-50 rounded-lg p-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <dt class="text-sm font-medium text-gray-500">Architecture</dt>
                            <dd class="mt-1 text-sm text-gray-900">${elfInfo.architecture}</dd>
                        </div>
                        <div>
                            <dt class="text-sm font-medium text-gray-500">File Type</dt>
                            <dd class="mt-1 text-sm text-gray-900">${elfInfo.file_type}</dd>
                        </div>
                        <div>
                            <dt class="text-sm font-medium text-gray-500">Entry Point</dt>
                            <dd class="mt-1 text-sm text-gray-900">0x${elfInfo.entry_point.toString(16)} (${elfInfo.entry_point})</dd>
                        </div>
                        <div>
                            <dt class="text-sm font-medium text-gray-500">Endianness</dt>
                            <dd class="mt-1 text-sm text-gray-900">${elfInfo.endianness}</dd>
                        </div>
                    </div>
                    ${elfInfo.sections && elfInfo.sections.length > 0 ? `
                        <div class="mt-4">
                            <dt class="text-sm font-medium text-gray-500">Sections (${elfInfo.sections.length})</dt>
                            <dd class="mt-1">
                                <div class="flex flex-wrap gap-1 mt-1">
                                    ${elfInfo.sections.map(section => 
                                        `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${section}</span>`
                                    ).join('')}
                                </div>
                            </dd>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderCoredumpInfo(coredumpInfo) {
        return `
            <div class="mb-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">Coredump Information</h3>
                <div class="bg-gray-50 rounded-lg p-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <dt class="text-sm font-medium text-gray-500">Architecture</dt>
                            <dd class="mt-1 text-sm text-gray-900">${coredumpInfo.architecture}</dd>
                        </div>
                        <div>
                            <dt class="text-sm font-medium text-gray-500">Thread Count</dt>
                            <dd class="mt-1 text-sm text-gray-900">${coredumpInfo.threads.length}</dd>
                        </div>
                    </div>
                    ${coredumpInfo.threads && coredumpInfo.threads.length > 0 ? `
                        <div class="mt-4">
                            <dt class="text-sm font-medium text-gray-500">Threads</dt>
                            <div class="mt-1 space-y-2">
                                ${coredumpInfo.threads.map(thread => `
                                    <div class="bg-white rounded border p-3">
                                        <div class="flex justify-between items-center">
                                            <span class="font-medium text-sm">Thread ${thread.thread_id}</span>
                                            <span class="text-xs text-gray-500">${thread.registers.length} bytes register data</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderRawJson(results) {
        return `
            <div class="mb-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">Raw JSON Output</h3>
                <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre class="text-sm text-green-400"><code>${JSON.stringify(results, null, 2)}</code></pre>
                </div>
            </div>
        `;
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new HimmelApp();
});