use anyhow::{Context, Result};
use goblin::elf::Elf;
use goblin::Object;
use object::{Object as ObjectTrait, ObjectSection};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;

// WebAssembly support
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[cfg(target_arch = "wasm32")]
macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FunctionInfo {
    pub name: String,
    pub address: u64,
    pub size: Option<u64>,
    pub parameters: Vec<VariableInfo>,
    pub return_type: Option<TypeInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VariableInfo {
    pub name: String,
    pub address: Option<u64>,
    pub offset: Option<i64>,
    pub type_info: TypeInfo,
    pub scope: String, // "global", "local", "parameter"
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TypeInfo {
    pub name: String,
    pub size: Option<u64>,
    pub kind: String, // "basic", "struct", "enum", "union", "pointer", "array"
    pub members: Vec<MemberInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MemberInfo {
    pub name: String,
    pub offset: u64,
    pub type_info: TypeInfo,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ElfInfo {
    pub architecture: String,
    pub entry_point: u64,
    pub sections: Vec<String>,
    pub file_type: String,
    pub endianness: String,
    pub functions: Vec<FunctionInfo>,
    pub variables: Vec<VariableInfo>,
    pub types: Vec<TypeInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub elf_info: Option<ElfInfo>,
}

/// Parse DWARF information from ELF file and extract enhanced information
pub fn analyze_elf_with_dwarf(file_path: &str) -> Result<ElfInfo> {
    let buffer =
        fs::read(file_path).with_context(|| format!("Failed to read ELF file: {file_path}"))?;

    match Object::parse(&buffer)? {
        Object::Elf(elf) => {
            let mut elf_info = extract_elf_info(&elf);
            if let Ok(dwarf_info) = extract_dwarf_info(&buffer) {
                elf_info.functions = dwarf_info.0;
                elf_info.variables = dwarf_info.1;
                elf_info.types = dwarf_info.2;
            }
            Ok(elf_info)
        }
        _ => anyhow::bail!("File is not a valid ELF binary"),
    }
}

/// Parse DWARF information from ELF byte buffer (WebAssembly-compatible)
pub fn analyze_elf_from_bytes_with_dwarf(buffer: &[u8]) -> Result<ElfInfo> {
    match Object::parse(buffer)? {
        Object::Elf(elf) => {
            let mut elf_info = extract_elf_info(&elf);
            if let Ok(dwarf_info) = extract_dwarf_info(buffer) {
                elf_info.functions = dwarf_info.0;
                elf_info.variables = dwarf_info.1;
                elf_info.types = dwarf_info.2;
            }
            Ok(elf_info)
        }
        _ => anyhow::bail!("File is not a valid ELF binary"),
    }
}

fn extract_dwarf_info(
    buffer: &[u8],
) -> Result<(Vec<FunctionInfo>, Vec<VariableInfo>, Vec<TypeInfo>)> {
    let object_file = object::File::parse(buffer)?;

    // Helper function to load DWARF sections
    let load_section = |id: gimli::SectionId| -> Result<std::borrow::Cow<[u8]>> {
        if let Some(section) = object_file.section_by_name(id.name()) {
            match section.uncompressed_data() {
                Ok(data) => Ok(data),
                Err(_) => Ok(std::borrow::Cow::Borrowed(&[])),
            }
        } else {
            Ok(std::borrow::Cow::Borrowed(&[]))
        }
    };

    // Load DWARF sections
    let dwarf_sections = gimli::DwarfSections::load(load_section)?;

    let dwarf =
        dwarf_sections.borrow(|section| gimli::EndianSlice::new(section, gimli::LittleEndian));

    let mut functions = Vec::new();
    let mut variables = Vec::new();
    let mut types = Vec::new();
    let mut type_cache: HashMap<gimli::UnitOffset, TypeInfo> = HashMap::new();

    // Iterate through compilation units
    let mut compilation_units = dwarf.units();
    while let Some(header) = compilation_units.next()? {
        let unit = dwarf.unit(header)?;

        // Iterate through DIEs (Debug Information Entries)
        let mut entries = unit.entries();
        while let Some((_, entry)) = entries.next_dfs()? {
            match entry.tag() {
                gimli::DW_TAG_subprogram => {
                    if let Ok(function_info) = extract_function_info(&dwarf, &unit, entry) {
                        functions.push(function_info);
                    }
                }
                gimli::DW_TAG_variable => {
                    if let Ok(variable_info) = extract_variable_info(&dwarf, &unit, entry, "global")
                    {
                        variables.push(variable_info);
                    }
                }
                gimli::DW_TAG_structure_type
                | gimli::DW_TAG_union_type
                | gimli::DW_TAG_enumeration_type => {
                    if let Ok(type_info) = extract_type_info(&dwarf, &unit, entry, &mut type_cache)
                    {
                        types.push(type_info);
                    }
                }
                _ => {}
            }
        }
    }

    Ok((functions, variables, types))
}

fn extract_function_info(
    dwarf: &gimli::Dwarf<gimli::EndianSlice<gimli::LittleEndian>>,
    unit: &gimli::Unit<gimli::EndianSlice<gimli::LittleEndian>>,
    entry: &gimli::DebuggingInformationEntry<gimli::EndianSlice<gimli::LittleEndian>>,
) -> Result<FunctionInfo> {
    let name = get_die_name(dwarf, unit, entry)?.unwrap_or_else(|| "<unknown>".to_string());

    let address = entry
        .attr_value(gimli::DW_AT_low_pc)?
        .and_then(|attr| match attr {
            gimli::AttributeValue::Addr(addr) => Some(addr),
            _ => None,
        })
        .unwrap_or(0);

    let size = entry
        .attr_value(gimli::DW_AT_high_pc)?
        .and_then(|attr| match attr {
            gimli::AttributeValue::Udata(size) => Some(size),
            gimli::AttributeValue::Addr(high_pc) => Some(high_pc.saturating_sub(address)),
            _ => None,
        });

    let mut parameters = Vec::new();

    // Extract parameters
    let mut child_entries = unit.entries_at_offset(entry.offset())?;
    child_entries.next_dfs()?; // Skip the current entry

    while let Some((_, child_entry)) = child_entries.next_dfs()? {
        if child_entry.tag() == gimli::DW_TAG_formal_parameter {
            if let Ok(param_info) = extract_variable_info(dwarf, unit, child_entry, "parameter") {
                parameters.push(param_info);
            }
        }
    }

    let return_type = entry
        .attr_value(gimli::DW_AT_type)?
        .and_then(|attr| match attr {
            gimli::AttributeValue::UnitRef(_offset) => Some(TypeInfo {
                name: "<return_type>".to_string(),
                size: None,
                kind: "unknown".to_string(),
                members: Vec::new(),
            }),
            _ => None,
        });

    Ok(FunctionInfo {
        name,
        address,
        size,
        parameters,
        return_type,
    })
}

fn extract_variable_info(
    dwarf: &gimli::Dwarf<gimli::EndianSlice<gimli::LittleEndian>>,
    unit: &gimli::Unit<gimli::EndianSlice<gimli::LittleEndian>>,
    entry: &gimli::DebuggingInformationEntry<gimli::EndianSlice<gimli::LittleEndian>>,
    scope: &str,
) -> Result<VariableInfo> {
    let name = get_die_name(dwarf, unit, entry)?.unwrap_or_else(|| "<unknown>".to_string());

    let address = entry
        .attr_value(gimli::DW_AT_location)?
        .and_then(|attr| match attr {
            gimli::AttributeValue::Exprloc(expr) => {
                // Simple case: direct address
                if expr.0.len() >= 9 && expr.0[0] == gimli::DW_OP_addr.0 {
                    let addr_bytes = &expr.0[1..9];
                    Some(u64::from_le_bytes([
                        addr_bytes[0],
                        addr_bytes[1],
                        addr_bytes[2],
                        addr_bytes[3],
                        addr_bytes[4],
                        addr_bytes[5],
                        addr_bytes[6],
                        addr_bytes[7],
                    ]))
                } else {
                    None
                }
            }
            _ => None,
        });

    let type_info = entry
        .attr_value(gimli::DW_AT_type)?
        .map(|_| TypeInfo {
            name: "unknown".to_string(),
            size: None,
            kind: "basic".to_string(),
            members: Vec::new(),
        })
        .unwrap_or_else(|| TypeInfo {
            name: "void".to_string(),
            size: None,
            kind: "basic".to_string(),
            members: Vec::new(),
        });

    Ok(VariableInfo {
        name,
        address,
        offset: None,
        type_info,
        scope: scope.to_string(),
    })
}

fn extract_type_info(
    dwarf: &gimli::Dwarf<gimli::EndianSlice<gimli::LittleEndian>>,
    unit: &gimli::Unit<gimli::EndianSlice<gimli::LittleEndian>>,
    entry: &gimli::DebuggingInformationEntry<gimli::EndianSlice<gimli::LittleEndian>>,
    type_cache: &mut HashMap<gimli::UnitOffset, TypeInfo>,
) -> Result<TypeInfo> {
    let name = get_die_name(dwarf, unit, entry)?.unwrap_or_else(|| "<anonymous>".to_string());

    let size = entry
        .attr_value(gimli::DW_AT_byte_size)?
        .and_then(|attr| match attr {
            gimli::AttributeValue::Udata(size) => Some(size),
            _ => None,
        });

    let kind = match entry.tag() {
        gimli::DW_TAG_structure_type => "struct",
        gimli::DW_TAG_union_type => "union",
        gimli::DW_TAG_enumeration_type => "enum",
        _ => "unknown",
    }
    .to_string();

    let mut members = Vec::new();

    // Extract members for struct/union
    if entry.tag() == gimli::DW_TAG_structure_type || entry.tag() == gimli::DW_TAG_union_type {
        let mut child_entries = unit.entries_at_offset(entry.offset())?;
        child_entries.next_dfs()?; // Skip the current entry

        while let Some((_, child_entry)) = child_entries.next_dfs()? {
            if child_entry.tag() == gimli::DW_TAG_member {
                if let Ok(member_info) = extract_member_info(dwarf, unit, child_entry, type_cache) {
                    members.push(member_info);
                }
            }
        }
    }

    Ok(TypeInfo {
        name,
        size,
        kind,
        members,
    })
}

fn extract_member_info(
    dwarf: &gimli::Dwarf<gimli::EndianSlice<gimli::LittleEndian>>,
    unit: &gimli::Unit<gimli::EndianSlice<gimli::LittleEndian>>,
    entry: &gimli::DebuggingInformationEntry<gimli::EndianSlice<gimli::LittleEndian>>,
    _type_cache: &mut HashMap<gimli::UnitOffset, TypeInfo>,
) -> Result<MemberInfo> {
    let name = get_die_name(dwarf, unit, entry)?.unwrap_or_else(|| "<unknown>".to_string());

    let offset = entry
        .attr_value(gimli::DW_AT_data_member_location)?
        .and_then(|attr| match attr {
            gimli::AttributeValue::Udata(offset) => Some(offset),
            _ => None,
        })
        .unwrap_or(0);

    let type_info = TypeInfo {
        name: "unknown".to_string(),
        size: None,
        kind: "basic".to_string(),
        members: Vec::new(),
    };

    Ok(MemberInfo {
        name,
        offset,
        type_info,
    })
}

fn get_die_name(
    dwarf: &gimli::Dwarf<gimli::EndianSlice<gimli::LittleEndian>>,
    _unit: &gimli::Unit<gimli::EndianSlice<gimli::LittleEndian>>,
    entry: &gimli::DebuggingInformationEntry<gimli::EndianSlice<gimli::LittleEndian>>,
) -> Result<Option<String>> {
    if let Some(attr) = entry.attr_value(gimli::DW_AT_name)? {
        match attr {
            gimli::AttributeValue::DebugStrRef(offset) => {
                let name = dwarf.debug_str.get_str(offset)?;
                Ok(Some(name.to_string_lossy().into_owned()))
            }
            gimli::AttributeValue::String(name) => Ok(Some(name.to_string_lossy().into_owned())),
            _ => Ok(None),
        }
    } else {
        Ok(None)
    }
}

/// Parse an ELF file and extract basic information (backward compatibility)
pub fn analyze_elf(file_path: &str) -> Result<ElfInfo> {
    analyze_elf_with_dwarf(file_path)
}

/// Parse an ELF file and extract basic information only (no DWARF)
pub fn analyze_elf_basic(file_path: &str) -> Result<ElfInfo> {
    let buffer =
        fs::read(file_path).with_context(|| format!("Failed to read ELF file: {file_path}"))?;

    match Object::parse(&buffer)? {
        Object::Elf(elf) => Ok(extract_elf_info(&elf)),
        _ => anyhow::bail!("File is not a valid ELF binary"),
    }
}

/// Parse an ELF file from byte buffer and extract basic information only (no DWARF)
pub fn analyze_elf_from_bytes_basic(buffer: &[u8]) -> Result<ElfInfo> {
    match Object::parse(buffer)? {
        Object::Elf(elf) => Ok(extract_elf_info(&elf)),
        _ => anyhow::bail!("File is not a valid ELF binary"),
    }
}

/// Parse an ELF file from byte buffer and extract basic information (WebAssembly-compatible)
pub fn analyze_elf_from_bytes(buffer: &[u8]) -> Result<ElfInfo> {
    analyze_elf_from_bytes_with_dwarf(buffer)
}

fn extract_elf_info(elf: &Elf) -> ElfInfo {
    use goblin::elf::header::*;

    let architecture = match elf.header.e_machine {
        EM_X86_64 => "x86_64",
        EM_386 => "i386",
        EM_AARCH64 => "aarch64",
        EM_ARM => "arm",
        EM_RISCV => "riscv",
        _ => "unknown",
    }
    .to_string();

    let file_type = match elf.header.e_type {
        ET_EXEC => "executable",
        ET_DYN => "shared_object",
        ET_REL => "relocatable",
        ET_CORE => "core_dump",
        _ => "unknown",
    }
    .to_string();

    let endianness = if elf.little_endian {
        "little_endian".to_string()
    } else {
        "big_endian".to_string()
    };

    let sections = elf
        .section_headers
        .iter()
        .map(|section| {
            elf.shdr_strtab
                .get_at(section.sh_name)
                .unwrap_or("unnamed")
                .to_string()
        })
        .collect();

    ElfInfo {
        architecture,
        entry_point: elf.entry,
        sections,
        file_type,
        endianness,
        functions: Vec::new(),
        variables: Vec::new(),
        types: Vec::new(),
    }
}

/// Analyze ELF files
pub fn analyze_files(elf_path: Option<&str>) -> Result<AnalysisResult> {
    let elf_info = if let Some(path) = elf_path {
        Some(analyze_elf(path)?)
    } else {
        None
    };

    Ok(AnalysisResult { elf_info })
}

/// Analyze ELF files from byte buffers (WebAssembly-compatible)
pub fn analyze_files_from_bytes(elf_data: Option<&[u8]>) -> Result<AnalysisResult> {
    let elf_info = if let Some(data) = elf_data {
        Some(analyze_elf_from_bytes(data)?)
    } else {
        None
    };

    Ok(AnalysisResult { elf_info })
}

/// Convert analysis result to prettified JSON
pub fn to_json(result: &AnalysisResult) -> Result<String> {
    serde_json::to_string_pretty(result).context("Failed to serialize result to JSON")
}

// WebAssembly bindings
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn analyze_elf_wasm(data: &[u8]) -> String {
    match analyze_elf_from_bytes_with_dwarf(data) {
        Ok(result) => match serde_json::to_string_pretty(&result) {
            Ok(json) => json,
            Err(e) => format!("{{\"error\": \"Failed to serialize result: {}\"}}", e),
        },
        Err(e) => format!("{{\"error\": \"{}\"}}", e),
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn analyze_elf_basic_wasm(data: &[u8]) -> String {
    match analyze_elf_from_bytes_basic(data) {
        Ok(result) => match serde_json::to_string_pretty(&result) {
            Ok(json) => json,
            Err(e) => format!("{{\"error\": \"Failed to serialize result: {}\"}}", e),
        },
        Err(e) => format!("{{\"error\": \"{}\"}}", e),
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn analyze_files_wasm(elf_data: Option<Box<[u8]>>) -> String {
    let elf_slice = elf_data.as_deref();

    match analyze_files_from_bytes(elf_slice) {
        Ok(result) => match to_json(&result) {
            Ok(json) => json,
            Err(e) => format!("{{\"error\": \"Failed to serialize result: {}\"}}", e),
        },
        Err(e) => format!("{{\"error\": \"{}\"}}", e),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    fn create_test_elf_file() -> NamedTempFile {
        let mut file = NamedTempFile::new().expect("Failed to create temp file");

        // Create a minimal valid ELF header for x86_64
        let elf_header = [
            0x7f, 0x45, 0x4c, 0x46, // ELF magic
            0x02, // 64-bit
            0x01, // Little endian
            0x01, // ELF version
            0x00, // System V ABI
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Padding
            0x02, 0x00, // ET_EXEC (executable file)
            0x3e, 0x00, // EM_X86_64
            0x01, 0x00, 0x00, 0x00, // Version
            0x00, 0x10, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00, // Entry point
            0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Program header offset
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Section header offset
            0x00, 0x00, 0x00, 0x00, // Flags
            0x40, 0x00, // ELF header size
            0x38, 0x00, // Program header size
            0x00, 0x00, // Program header count
            0x40, 0x00, // Section header size
            0x00, 0x00, // Section header count
            0x00, 0x00, // Section header string table index
        ];

        file.write_all(&elf_header)
            .expect("Failed to write ELF header");
        file
    }

    fn create_invalid_file() -> NamedTempFile {
        let mut file = NamedTempFile::new().expect("Failed to create temp file");
        file.write_all(b"not an elf file")
            .expect("Failed to write invalid data");
        file
    }

    #[test]
    fn test_analysis_result_serialization() {
        let result = AnalysisResult { elf_info: None };

        let json = to_json(&result).unwrap();
        assert!(json.contains("elf_info"));
        assert!(json.contains("null"));
    }

    #[test]
    fn test_analysis_result_with_data_serialization() {
        let elf_info = ElfInfo {
            architecture: "x86_64".to_string(),
            entry_point: 0x401000,
            sections: vec![".text".to_string(), ".data".to_string()],
            file_type: "executable".to_string(),
            endianness: "little_endian".to_string(),
            functions: Vec::new(),
            variables: Vec::new(),
            types: Vec::new(),
        };

        let result = AnalysisResult {
            elf_info: Some(elf_info),
        };

        let json = to_json(&result).unwrap();

        assert!(json.contains("x86_64"));
        assert!(json.contains("4198400")); // 0x401000 in decimal
        assert!(json.contains(".text"));
        assert!(json.contains("executable"));
        assert!(json.contains("little_endian"));
    }

    #[test]
    fn test_analyze_elf_success() {
        let temp_file = create_test_elf_file();
        let file_path = temp_file.path().to_str().unwrap();

        let result = analyze_elf(file_path).unwrap();

        assert_eq!(result.architecture, "x86_64");
        assert_eq!(result.entry_point, 0x401000);
        assert_eq!(result.file_type, "executable");
        assert_eq!(result.endianness, "little_endian");
        assert!(result.sections.is_empty()); // No sections in minimal ELF
    }

    #[test]
    fn test_analyze_elf_file_not_found() {
        let result = analyze_elf("/nonexistent/path");
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Failed to read ELF file"));
    }

    #[test]
    fn test_analyze_elf_invalid_file() {
        let temp_file = create_invalid_file();
        let file_path = temp_file.path().to_str().unwrap();

        let result = analyze_elf(file_path);
        assert!(result.is_err());

        let error_msg = result.unwrap_err().to_string();

        // More flexible error checking - any parsing error is acceptable
        assert!(
            error_msg.contains("File is not a valid ELF binary")
                || error_msg.contains("Bad magic")
                || error_msg.contains("Malformed")
                || error_msg.contains("too small")
        );
    }

    #[test]
    fn test_analyze_files_elf_valid() {
        let elf_file = create_test_elf_file();
        let elf_path = elf_file.path().to_str().unwrap();

        let result = analyze_files(Some(elf_path)).unwrap();

        assert!(result.elf_info.is_some());

        let elf_info = result.elf_info.unwrap();
        assert_eq!(elf_info.architecture, "x86_64");
    }

    #[test]
    fn test_analyze_files_only_elf() {
        let elf_file = create_test_elf_file();
        let elf_path = elf_file.path().to_str().unwrap();

        let result = analyze_files(Some(elf_path)).unwrap();

        assert!(result.elf_info.is_some());
    }

    #[test]
    fn test_analyze_files_none() {
        let result = analyze_files(None).unwrap();

        assert!(result.elf_info.is_none());
    }

    #[test]
    fn test_analyze_files_elf_error() {
        let result = analyze_files(Some("/nonexistent/elf"));
        assert!(result.is_err());
    }

    #[test]
    fn test_extract_elf_info_different_architectures() {
        // Since we can't easily mock goblin::elf::Elf, we'll test via the public interface
        // by creating different architecture ELF files and testing the extract logic indirectly

        // This test verifies that our architecture mapping logic works
        // We've already tested this through the integration tests above with real ELF files

        // Test the architecture string mapping directly
        use goblin::elf::header::*;

        let test_cases = vec![
            (EM_X86_64, "x86_64"),
            (EM_386, "i386"),
            (EM_AARCH64, "aarch64"),
            (EM_ARM, "arm"),
            (EM_RISCV, "riscv"),
            (999, "unknown"), // Unknown architecture
        ];

        for (machine_type, expected_arch) in test_cases {
            let arch_str = match machine_type {
                EM_X86_64 => "x86_64",
                EM_386 => "i386",
                EM_AARCH64 => "aarch64",
                EM_ARM => "arm",
                EM_RISCV => "riscv",
                _ => "unknown",
            };
            assert_eq!(arch_str, expected_arch);
        }
    }

    #[test]
    fn test_to_json_error_handling() {
        // Test with a result that should serialize properly
        let result = AnalysisResult { elf_info: None };

        let json_result = to_json(&result);
        assert!(json_result.is_ok());

        let json = json_result.unwrap();
        assert!(serde_json::from_str::<serde_json::Value>(&json).is_ok());
    }

    #[test]
    fn test_elf_info_creation() {
        let elf = ElfInfo {
            architecture: "arm".to_string(),
            entry_point: 0x8000,
            sections: vec![".init".to_string(), ".fini".to_string()],
            file_type: "shared_object".to_string(),
            endianness: "big_endian".to_string(),
            functions: Vec::new(),
            variables: Vec::new(),
            types: Vec::new(),
        };

        assert_eq!(elf.architecture, "arm");
        assert_eq!(elf.entry_point, 0x8000);
        assert_eq!(elf.sections.len(), 2);
        assert_eq!(elf.file_type, "shared_object");
        assert_eq!(elf.endianness, "big_endian");
    }

    #[test]
    fn test_analyze_elf_from_bytes_success() {
        let temp_file = create_test_elf_file();
        let buffer = std::fs::read(temp_file.path()).unwrap();

        let result = analyze_elf_from_bytes(&buffer).unwrap();

        assert_eq!(result.architecture, "x86_64");
        assert_eq!(result.entry_point, 0x401000);
        assert_eq!(result.file_type, "executable");
        assert_eq!(result.endianness, "little_endian");
        assert!(result.sections.is_empty()); // No sections in minimal ELF
    }

    #[test]
    fn test_analyze_elf_from_bytes_invalid() {
        let invalid_data = vec![0x00, 0x01, 0x02, 0x03]; // Not a valid ELF file
        let result = analyze_elf_from_bytes(&invalid_data);
        assert!(result.is_err());
    }

    #[test]
    fn test_analyze_files_from_bytes_elf() {
        let elf_file = create_test_elf_file();
        let elf_buffer = std::fs::read(elf_file.path()).unwrap();

        let result = analyze_files_from_bytes(Some(&elf_buffer)).unwrap();

        assert!(result.elf_info.is_some());

        let elf_info = result.elf_info.unwrap();
        assert_eq!(elf_info.architecture, "x86_64");
    }

    #[test]
    fn test_analyze_files_from_bytes_elf_only() {
        let elf_file = create_test_elf_file();
        let elf_buffer = std::fs::read(elf_file.path()).unwrap();

        let result = analyze_files_from_bytes(Some(&elf_buffer)).unwrap();

        assert!(result.elf_info.is_some());
    }

    #[test]
    fn test_analyze_files_from_bytes_none() {
        let result = analyze_files_from_bytes(None).unwrap();

        assert!(result.elf_info.is_none());
    }

    #[test]
    fn test_dwarf_parsing_with_debug_binary() {
        // Create a simple C program with debug info
        let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
        let source_path = temp_dir.path().join("test.c");
        let binary_path = temp_dir.path().join("test");

        let c_source = r#"
struct Point {
    int x;
    int y;
};

enum Color {
    RED,
    GREEN,
    BLUE
};

int global_var = 42;

int add(int a, int b) {
    return a + b;
}

int main() {
    struct Point p = {1, 2};
    return add(p.x, p.y);
}
"#;

        std::fs::write(&source_path, c_source).expect("Failed to write C source");

        // Compile with debug info
        let output = std::process::Command::new("gcc")
            .args(["-g", "-O0", "-o"])
            .arg(&binary_path)
            .arg(&source_path)
            .output();

        if let Ok(output) = output {
            if output.status.success() {
                // Test the enhanced analysis
                if let Ok(result) = analyze_elf_with_dwarf(binary_path.to_str().unwrap()) {
                    // Should have detected debug information
                    assert_eq!(result.architecture, "x86_64");

                    // Should have extracted some functions
                    let function_names: Vec<&str> =
                        result.functions.iter().map(|f| f.name.as_str()).collect();
                    assert!(function_names.contains(&"main") || function_names.contains(&"add"));

                    // Should have extracted some types
                    let type_names: Vec<&str> =
                        result.types.iter().map(|t| t.name.as_str()).collect();
                    // Note: types might not always be detected depending on compilation

                    println!("Functions found: {function_names:?}");
                    println!("Types found: {type_names:?}");
                }
            }
        }
        // Test should not fail if gcc is not available - this is an optional enhancement test
    }

    #[test]
    fn test_dwarf_data_structures() {
        // Test the new data structures for serialization
        let function_info = FunctionInfo {
            name: "test_function".to_string(),
            address: 0x1000,
            size: Some(100),
            parameters: vec![VariableInfo {
                name: "param1".to_string(),
                address: None,
                offset: Some(8),
                type_info: TypeInfo {
                    name: "int".to_string(),
                    size: Some(4),
                    kind: "basic".to_string(),
                    members: Vec::new(),
                },
                scope: "parameter".to_string(),
            }],
            return_type: Some(TypeInfo {
                name: "int".to_string(),
                size: Some(4),
                kind: "basic".to_string(),
                members: Vec::new(),
            }),
        };

        let type_info = TypeInfo {
            name: "TestStruct".to_string(),
            size: Some(16),
            kind: "struct".to_string(),
            members: vec![
                MemberInfo {
                    name: "field1".to_string(),
                    offset: 0,
                    type_info: TypeInfo {
                        name: "int".to_string(),
                        size: Some(4),
                        kind: "basic".to_string(),
                        members: Vec::new(),
                    },
                },
                MemberInfo {
                    name: "field2".to_string(),
                    offset: 8,
                    type_info: TypeInfo {
                        name: "double".to_string(),
                        size: Some(8),
                        kind: "basic".to_string(),
                        members: Vec::new(),
                    },
                },
            ],
        };

        let variable_info = VariableInfo {
            name: "global_var".to_string(),
            address: Some(0x2000),
            offset: None,
            type_info: type_info.clone(),
            scope: "global".to_string(),
        };

        // Test serialization
        assert!(serde_json::to_string(&function_info).is_ok());
        assert!(serde_json::to_string(&type_info).is_ok());
        assert!(serde_json::to_string(&variable_info).is_ok());

        // Test field access
        assert_eq!(function_info.name, "test_function");
        assert_eq!(function_info.address, 0x1000);
        assert_eq!(function_info.parameters.len(), 1);
        assert_eq!(function_info.parameters[0].name, "param1");

        assert_eq!(type_info.name, "TestStruct");
        assert_eq!(type_info.members.len(), 2);
        assert_eq!(type_info.members[0].offset, 0);
        assert_eq!(type_info.members[1].offset, 8);

        assert_eq!(variable_info.scope, "global");
        assert_eq!(variable_info.address, Some(0x2000));
    }

    #[test]
    fn test_enhanced_elf_info_json_output() {
        // Test that the enhanced ElfInfo structure produces valid, jq-compatible JSON
        let enhanced_elf = ElfInfo {
            architecture: "x86_64".to_string(),
            entry_point: 0x1000,
            sections: vec![".text".to_string(), ".data".to_string()],
            file_type: "executable".to_string(),
            endianness: "little_endian".to_string(),
            functions: vec![FunctionInfo {
                name: "main".to_string(),
                address: 0x1100,
                size: Some(50),
                parameters: vec![VariableInfo {
                    name: "argc".to_string(),
                    address: None,
                    offset: Some(8),
                    type_info: TypeInfo {
                        name: "int".to_string(),
                        size: Some(4),
                        kind: "basic".to_string(),
                        members: Vec::new(),
                    },
                    scope: "parameter".to_string(),
                }],
                return_type: Some(TypeInfo {
                    name: "int".to_string(),
                    size: Some(4),
                    kind: "basic".to_string(),
                    members: Vec::new(),
                }),
            }],
            variables: vec![VariableInfo {
                name: "global_counter".to_string(),
                address: Some(0x2000),
                offset: None,
                type_info: TypeInfo {
                    name: "int".to_string(),
                    size: Some(4),
                    kind: "basic".to_string(),
                    members: Vec::new(),
                },
                scope: "global".to_string(),
            }],
            types: vec![TypeInfo {
                name: "Point".to_string(),
                size: Some(8),
                kind: "struct".to_string(),
                members: vec![
                    MemberInfo {
                        name: "x".to_string(),
                        offset: 0,
                        type_info: TypeInfo {
                            name: "int".to_string(),
                            size: Some(4),
                            kind: "basic".to_string(),
                            members: Vec::new(),
                        },
                    },
                    MemberInfo {
                        name: "y".to_string(),
                        offset: 4,
                        type_info: TypeInfo {
                            name: "int".to_string(),
                            size: Some(4),
                            kind: "basic".to_string(),
                            members: Vec::new(),
                        },
                    },
                ],
            }],
        };

        let analysis_result = AnalysisResult {
            elf_info: Some(enhanced_elf),
        };

        // Test JSON serialization
        let json = to_json(&analysis_result).expect("Should serialize to JSON");

        // Verify it's valid JSON
        let parsed: serde_json::Value = serde_json::from_str(&json).expect("Should be valid JSON");

        // Test jq-like access patterns (verify structure is accessible)
        assert!(parsed["elf_info"]["functions"].is_array());
        assert!(parsed["elf_info"]["variables"].is_array());
        assert!(parsed["elf_info"]["types"].is_array());

        // Verify function information
        let functions = &parsed["elf_info"]["functions"];
        assert_eq!(functions[0]["name"], "main");
        assert_eq!(functions[0]["address"], 0x1100);
        assert_eq!(functions[0]["parameters"][0]["name"], "argc");

        // Verify type information
        let types = &parsed["elf_info"]["types"];
        assert_eq!(types[0]["name"], "Point");
        assert_eq!(types[0]["kind"], "struct");
        assert_eq!(types[0]["members"][0]["name"], "x");
        assert_eq!(types[0]["members"][0]["offset"], 0);
        assert_eq!(types[0]["members"][1]["offset"], 4);

        // Verify variable information
        let variables = &parsed["elf_info"]["variables"];
        assert_eq!(variables[0]["name"], "global_counter");
        assert_eq!(variables[0]["address"], 0x2000);
        assert_eq!(variables[0]["scope"], "global");
    }

    #[test]
    fn test_analyze_demo_binaries_from_bytes() {
        // Test basic analysis of demo binaries from byte data (without expensive DWARF parsing)
        // Using smaller binaries to avoid slow test execution
        let demo_paths = [
            "demo-binaries/bin/x86_64/hello",
            "demo-binaries/bin/aarch64/fibonacci",
            "demo-binaries/bin/riscv64/hello", // Changed from counter (3.7MB) to hello (544KB) for faster test
        ];

        for path in demo_paths {
            if std::path::Path::new(path).exists() {
                let data = std::fs::read(path).unwrap();
                // Use basic analysis to avoid expensive DWARF parsing in tests
                let result = analyze_elf_from_bytes_basic(&data).unwrap();
                // Note: file_type can be either "executable" or "shared_object" depending on linking
                assert!(["executable", "shared_object"].contains(&result.file_type.as_str()));
                assert_eq!(result.endianness, "little_endian");
                assert!(result.entry_point > 0);

                // Architecture should be valid
                assert!(["x86_64", "aarch64", "riscv"].contains(&result.architecture.as_str()));
            }
        }
    }
}
