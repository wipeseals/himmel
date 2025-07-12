import { ElfInfo, FunctionInfo, VariableInfo, TypeInfo } from './types';

export class ResultsRenderer {
  constructor(private container: HTMLElement) {}

  render(results: any): void {
    let html = '';

    // ELF Information
    if (results.elf_info) {
      html += this.renderElfInfo(results.elf_info);
    }

    // Raw JSON
    html += this.renderRawJson(results);

    this.container.innerHTML = html;
  }

  private renderElfInfo(elfInfo: ElfInfo): string {
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

  private renderDwarfInfo(elfInfo: ElfInfo): string {
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

  private renderFunctions(functions?: FunctionInfo[]): string {
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

  private renderVariables(variables?: VariableInfo[]): string {
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

  private renderTypes(types?: TypeInfo[]): string {
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

  private renderRawJson(results: any): string {
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