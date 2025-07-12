// Type definitions for the WASM module and analysis results

export interface WasmModule {
  analyze_files_wasm: (elfData: Uint8Array | null) => string;
  analyze_elf_wasm?: (elfData: Uint8Array) => string;
}

export interface TypeInfo {
  name: string;
  size?: number;
  kind: string; // "basic", "struct", "enum", "union", "pointer", "array"
  members: MemberInfo[];
}

export interface MemberInfo {
  name: string;
  offset: number;
  type_info: TypeInfo;
}

export interface VariableInfo {
  name: string;
  address?: number;
  offset?: number;
  type_info: TypeInfo;
  scope: string; // "global", "local", "parameter"
}

export interface FunctionInfo {
  name: string;
  address: number;
  size?: number;
  parameters: VariableInfo[];
  return_type?: TypeInfo;
}

export interface ElfInfo {
  architecture: string;
  entry_point: number;
  sections: string[];
  file_type: string;
  endianness: string;
  functions?: FunctionInfo[];
  variables?: VariableInfo[];
  types?: TypeInfo[];
}

export interface AnalysisResult {
  elf_info?: ElfInfo;
  error?: string;
}

export interface DemoBinary {
  program: string;
  arch: string;
  name: string;
  size: string;
}

export interface AppState {
  wasmModule: WasmModule | null;
  elfFile: File | null;
  isLoading: boolean;
  error: string | null;
  results: AnalysisResult | null;
}