import init, { analyze_files_wasm, analyze_elf_wasm } from './himmel.js';

class HimmelApp {
    constructor() {
        this.wasmModule = null;
        this.elfFile = null;
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

        // Drag and drop handlers
        this.setupDragAndDrop('elf-dropzone', 'elf');

        // Demo binary handlers
        document.querySelectorAll('.demo-binary-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleDemoBinarySelect(e.target.dataset.program, e.target.dataset.arch);
            });
        });

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
        const hasFiles = this.elfFile;
        analyzeBtn.disabled = !hasFiles;
    }

    async handleDemoBinarySelect(program, arch) {
        try {
            // Show loading state on the selected button
            const selectedBtn = document.querySelector(`[data-program="${program}"][data-arch="${arch}"]`);
            const originalText = selectedBtn.textContent;
            selectedBtn.textContent = 'Loading...';
            selectedBtn.disabled = true;

            // Fetch the demo binary
            const response = await fetch(`../demo-binaries/bin/${arch}/${program}`);
            if (!response.ok) {
                throw new Error(`Failed to load demo binary: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            
            // Create a File-like object from the binary data
            const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
            const file = new File([blob], `${program}-${arch}`, { type: 'application/octet-stream' });

            // Use the existing file handling logic
            this.elfFile = file;
            this.updateFileInfo('elf', `${program} (${arch})`, file.size);
            
            // Show demo binary selection feedback
            const demoBinaryInfo = document.getElementById('demo-binary-info');
            const demoBinaryName = document.getElementById('demo-binary-name');
            demoBinaryName.textContent = `Demo binary loaded: ${program} (${arch})`;
            demoBinaryInfo.classList.remove('hidden');

            // Hide after 3 seconds
            setTimeout(() => {
                demoBinaryInfo.classList.add('hidden');
            }, 3000);

            this.updateAnalyzeButton();
            
            // Restore button
            selectedBtn.textContent = originalText;
            selectedBtn.disabled = false;
            
        } catch (error) {
            console.error('Error loading demo binary:', error);
            this.showError(`Failed to load demo binary: ${error.message}`);
            
            // Restore button
            const selectedBtn = document.querySelector(`[data-program="${program}"][data-arch="${arch}"]`);
            selectedBtn.textContent = selectedBtn.textContent.replace('Loading...', `📄 ${arch}`);
            selectedBtn.disabled = false;
        }
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

            // Read ELF file if provided
            if (this.elfFile) {
                elfData = new Uint8Array(await this.elfFile.arrayBuffer());
            }

            // Call WebAssembly function
            const result = analyze_files_wasm(elfData);
            
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
            ${this.renderDwarfInfo(elfInfo)}
        `;
    }

    renderDwarfInfo(elfInfo) {
        if (!elfInfo.functions && !elfInfo.variables && !elfInfo.types) {
            return '';
        }

        return `
            <div class="mb-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">DWARF Debug Information</h3>
                
                ${this.renderFunctions(elfInfo.functions)}
                ${this.renderVariables(elfInfo.variables)}
                ${this.renderTypes(elfInfo.types)}
            </div>
        `;
    }

    renderFunctions(functions) {
        if (!functions || functions.length === 0) {
            return '';
        }

        return `
            <div class="mb-6">
                <h4 class="text-md font-medium text-gray-900 mb-3">Functions (${functions.length})</h4>
                <div class="bg-white border rounded-lg divide-y divide-gray-200">
                    ${functions.map(func => `
                        <div class="p-4">
                            <div class="flex items-center justify-between mb-2">
                                <h5 class="font-medium text-gray-900">${func.name}</h5>
                                <div class="flex gap-2">
                                    ${func.address ? `<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">0x${func.address.toString(16)}</span>` : ''}
                                    ${func.size ? `<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">${func.size} bytes</span>` : ''}
                                </div>
                            </div>
                            ${func.parameters && func.parameters.length > 0 ? `
                                <div class="mt-2">
                                    <span class="text-sm font-medium text-gray-600">Parameters:</span>
                                    <div class="mt-1 flex flex-wrap gap-1">
                                        ${func.parameters.map(param => `
                                            <span class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                                ${param.name}: ${param.type_info.name}
                                            </span>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            ${func.return_type ? `
                                <div class="mt-2">
                                    <span class="text-sm font-medium text-gray-600">Returns:</span>
                                    <span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded ml-1">${func.return_type.name}</span>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderVariables(variables) {
        if (!variables || variables.length === 0) {
            return '';
        }

        return `
            <div class="mb-6">
                <h4 class="text-md font-medium text-gray-900 mb-3">Variables (${variables.length})</h4>
                <div class="bg-white border rounded-lg divide-y divide-gray-200">
                    ${variables.map(variable => `
                        <div class="p-4">
                            <div class="flex items-center justify-between mb-2">
                                <h5 class="font-medium text-gray-900">${variable.name}</h5>
                                <div class="flex gap-2">
                                    <span class="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">${variable.scope}</span>
                                    ${variable.address ? `<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">0x${variable.address.toString(16)}</span>` : ''}
                                    ${variable.offset !== null && variable.offset !== undefined ? `<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">offset: ${variable.offset}</span>` : ''}
                                </div>
                            </div>
                            <div>
                                <span class="text-sm font-medium text-gray-600">Type:</span>
                                <span class="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded ml-1">
                                    ${variable.type_info.name} (${variable.type_info.kind})
                                </span>
                                ${variable.type_info.size ? `<span class="text-xs text-gray-500 ml-1">${variable.type_info.size} bytes</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderTypes(types) {
        if (!types || types.length === 0) {
            return '';
        }

        return `
            <div class="mb-6">
                <h4 class="text-md font-medium text-gray-900 mb-3">Type Definitions (${types.length})</h4>
                <div class="bg-white border rounded-lg divide-y divide-gray-200">
                    ${types.map(type => `
                        <div class="p-4">
                            <div class="flex items-center justify-between mb-2">
                                <h5 class="font-medium text-gray-900">${type.name}</h5>
                                <div class="flex gap-2">
                                    <span class="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">${type.kind}</span>
                                    ${type.size ? `<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">${type.size} bytes</span>` : ''}
                                </div>
                            </div>
                            ${type.members && type.members.length > 0 ? `
                                <div class="mt-2">
                                    <span class="text-sm font-medium text-gray-600">Members:</span>
                                    <div class="mt-1 space-y-1">
                                        ${type.members.map(member => `
                                            <div class="flex items-center justify-between text-sm bg-gray-50 rounded px-2 py-1">
                                                <span class="font-medium">${member.name}</span>
                                                <div class="flex gap-2">
                                                    <span class="text-xs bg-gray-200 text-gray-700 px-1 rounded">offset: ${member.offset}</span>
                                                    <span class="text-xs bg-indigo-100 text-indigo-800 px-1 rounded">${member.type_info.name}</span>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
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