export class UploadSection {
  private container: HTMLElement;
  private onFileSelect: (file: File) => void;

  constructor(container: HTMLElement, onFileSelect: (file: File) => void) {
    this.container = container;
    this.onFileSelect = onFileSelect;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Or Upload Your Own ELF Files</h2>
        
        <!-- ELF File Upload -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">ELF Binary File</label>
          <div class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-primary transition-colors" id="elf-dropzone">
            <div class="space-y-1 text-center">
              <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div class="flex text-sm text-gray-600">
                <label for="elf-file-upload" class="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-secondary focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                  <span>Upload ELF file</span>
                  <input id="elf-file-upload" name="elf-file-upload" type="file" class="sr-only">
                </label>
                <p class="pl-1">or drag and drop</p>
              </div>
              <p class="text-xs text-gray-500">Binary files up to 10MB</p>
            </div>
          </div>
          <div id="elf-file-info" class="mt-2 hidden">
            <div class="flex items-center text-sm text-gray-600">
              <svg class="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
              </svg>
              <span id="elf-file-name"></span>
              <span id="elf-file-size" class="ml-2 text-gray-400"></span>
            </div>
          </div>
        </div>

        <!-- Analyze Button -->
        <div class="flex justify-center">
          <button id="analyze-btn" 
                  class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  disabled>
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
            </svg>
            Analyze ELF File
          </button>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    // File input handler
    const fileInput = this.container.querySelector('#elf-file-upload') as HTMLInputElement;
    fileInput.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        this.handleFileSelect(files[0]);
      }
    });

    // Drag and drop handlers
    this.setupDragAndDrop();
  }

  private setupDragAndDrop(): void {
    const dropzone = this.container.querySelector('#elf-dropzone') as HTMLElement;
    
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
      
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        this.handleFileSelect(files[0]);
      }
    });
  }

  private handleFileSelect(file: File): void {
    if (!file) return;

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 10MB limit');
    }

    // Update UI
    this.updateFileInfo(file.name, file.size);
    
    // Notify parent
    this.onFileSelect(file);
  }

  private updateFileInfo(fileName: string, fileSize: number): void {
    const fileInfo = this.container.querySelector('#elf-file-info') as HTMLElement;
    const fileNameEl = this.container.querySelector('#elf-file-name') as HTMLElement;
    const fileSizeEl = this.container.querySelector('#elf-file-size') as HTMLElement;
    
    fileNameEl.textContent = fileName;
    fileSizeEl.textContent = `(${this.formatFileSize(fileSize)})`;
    fileInfo.classList.remove('hidden');
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  public updateAnalyzeButton(hasFiles: boolean): void {
    const analyzeBtn = this.container.querySelector('#analyze-btn') as HTMLButtonElement;
    analyzeBtn.disabled = !hasFiles;
  }

  public getAnalyzeButton(): HTMLButtonElement {
    return this.container.querySelector('#analyze-btn') as HTMLButtonElement;
  }
}