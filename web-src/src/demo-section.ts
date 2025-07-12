import { DemoBinary } from './types';

export class DemoSection {
  private container: HTMLElement;
  private onBinarySelect: (program: string, arch: string) => Promise<void>;

  constructor(container: HTMLElement, onBinarySelect: (program: string, arch: string) => Promise<void>) {
    this.container = container;
    this.onBinarySelect = onBinarySelect;
    this.render();
  }

  private render(): void {
    const demoBinaries: DemoBinary[] = [
      { program: 'hello', arch: 'x86_64', name: 'Hello World (C)', size: '767KB' },
      { program: 'hello', arch: 'aarch64', name: 'Hello World (C)', size: '619KB' },
      { program: 'hello', arch: 'riscv64', name: 'Hello World (C)', size: '544KB' },
      { program: 'fibonacci', arch: 'x86_64', name: 'Fibonacci (C)', size: '768KB' },
      { program: 'fibonacci', arch: 'aarch64', name: 'Fibonacci (C)', size: '620KB' },
      { program: 'fibonacci', arch: 'riscv64', name: 'Fibonacci (C)', size: '544KB' },
      { program: 'counter', arch: 'x86_64', name: 'Counter (Rust)', size: '3.6MB' },
      { program: 'counter', arch: 'aarch64', name: 'Counter (Rust)', size: '3.6MB' },
      { program: 'counter', arch: 'riscv64', name: 'Counter (Rust)', size: '3.7MB' },
    ];

    const grouped = this.groupBinaries(demoBinaries);

    this.container.innerHTML = `
      <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Try Demo Binaries</h2>
        <p class="text-gray-600 mb-4">
          Select from pre-compiled demo programs to quickly test himmel's analysis capabilities.
        </p>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          ${Object.entries(grouped).map(([programName, binaries]) => this.renderProgramGroup(programName, binaries)).join('')}
        </div>

        <div id="demo-binary-info" class="mt-4 hidden">
          <div class="flex items-center text-sm text-green-600 bg-green-50 border border-green-200 rounded p-3">
            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
            </svg>
            <span id="demo-binary-name">Demo binary loaded</span>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private groupBinaries(binaries: DemoBinary[]): Record<string, DemoBinary[]> {
    const groups: Record<string, DemoBinary[]> = {};
    
    binaries.forEach(binary => {
      if (!groups[binary.program]) {
        groups[binary.program] = [];
      }
      groups[binary.program].push(binary);
    });

    return groups;
  }

  private renderProgramGroup(programName: string, binaries: DemoBinary[]): string {
    const displayName = this.getDisplayName(programName);
    const description = this.getDescription(programName);

    return `
      <div class="border border-gray-200 rounded-lg p-4">
        <h3 class="font-medium text-gray-900 mb-2">${displayName}</h3>
        <p class="text-sm text-gray-600 mb-3">${description}</p>
        <div class="space-y-2">
          ${binaries.map(binary => `
            <button class="demo-binary-btn w-full text-left px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors" 
                    data-program="${binary.program}" data-arch="${binary.arch}">
              📄 ${binary.arch} (${binary.size})
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  private getDisplayName(program: string): string {
    const names: Record<string, string> = {
      hello: 'Hello World (C)',
      fibonacci: 'Fibonacci (C)',
      counter: 'Counter (Rust)'
    };
    return names[program] || program;
  }

  private getDescription(program: string): string {
    const descriptions: Record<string, string> = {
      hello: 'Simple C program compiled for different architectures',
      fibonacci: 'Recursive fibonacci calculator in C',
      counter: 'Simple counter program written in Rust'
    };
    return descriptions[program] || '';
  }

  private attachEventListeners(): void {
    const buttons = this.container.querySelectorAll('.demo-binary-btn');
    buttons.forEach(button => {
      button.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const program = target.dataset.program!;
        const arch = target.dataset.arch!;
        
        await this.handleBinarySelect(target, program, arch);
      });
    });
  }

  private async handleBinarySelect(button: HTMLElement, program: string, arch: string): Promise<void> {
    const originalText = button.textContent;
    button.textContent = 'Loading...';
    (button as HTMLButtonElement).disabled = true;

    try {
      await this.onBinarySelect(program, arch);
      this.showSuccessMessage(`Demo binary loaded: ${program} (${arch})`);
    } catch (error) {
      console.error('Error loading demo binary:', error);
      throw error; // Re-throw so the parent can handle the error display
    } finally {
      button.textContent = originalText;
      (button as HTMLButtonElement).disabled = false;
    }
  }

  private showSuccessMessage(message: string): void {
    const infoElement = this.container.querySelector('#demo-binary-info') as HTMLElement;
    const nameElement = this.container.querySelector('#demo-binary-name') as HTMLElement;
    
    nameElement.textContent = message;
    infoElement.classList.remove('hidden');

    // Hide after 3 seconds
    setTimeout(() => {
      infoElement.classList.add('hidden');
    }, 3000);
  }
}