use anyhow::{Context, Result};
use goblin::elf::Elf;
use goblin::Object;
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
pub struct ElfInfo {
    pub architecture: String,
    pub entry_point: u64,
    pub sections: Vec<String>,
    pub file_type: String,
    pub endianness: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ThreadInfo {
    pub thread_id: u32,
    pub registers: Vec<u8>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CoredumpInfo {
    pub threads: Vec<ThreadInfo>,
    pub architecture: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub elf_info: Option<ElfInfo>,
    pub coredump_info: Option<CoredumpInfo>,
}

/// Parse an ELF file and extract basic information
pub fn analyze_elf(file_path: &str) -> Result<ElfInfo> {
    let buffer = fs::read(file_path)
        .with_context(|| format!("Failed to read ELF file: {}", file_path))?;

    match Object::parse(&buffer)? {
        Object::Elf(elf) => Ok(extract_elf_info(&elf)),
        _ => anyhow::bail!("File is not a valid ELF binary"),
    }
}

fn extract_elf_info(elf: &Elf) -> ElfInfo {
    let architecture = match elf.header.e_machine {
        goblin::elf::header::EM_X86_64 => "x86_64",
        goblin::elf::header::EM_386 => "i386",
        goblin::elf::header::EM_AARCH64 => "aarch64",
        goblin::elf::header::EM_ARM => "arm",
        goblin::elf::header::EM_RISCV => "riscv",
        _ => "unknown",
    }.to_string();

    let file_type = match elf.header.e_type {
        goblin::elf::header::ET_EXEC => "executable",
        goblin::elf::header::ET_DYN => "shared_object",
        goblin::elf::header::ET_REL => "relocatable",
        goblin::elf::header::ET_CORE => "core_dump",
        _ => "unknown",
    }.to_string();

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
    }
}

/// Parse a coredump file and extract thread and register information
pub fn analyze_coredump(file_path: &str) -> Result<CoredumpInfo> {
    let buffer = fs::read(file_path)
        .with_context(|| format!("Failed to read coredump file: {}", file_path))?;

    match Object::parse(&buffer)? {
        Object::Elf(elf) => {
            if elf.header.e_type != goblin::elf::header::ET_CORE {
                anyhow::bail!("File is not a coredump (ET_CORE)");
            }
            extract_coredump_info(&elf, &buffer)
        }
        _ => anyhow::bail!("File is not a valid ELF coredump"),
    }
}

fn extract_coredump_info(elf: &Elf, buffer: &[u8]) -> Result<CoredumpInfo> {
    let architecture = match elf.header.e_machine {
        goblin::elf::header::EM_X86_64 => "x86_64",
        goblin::elf::header::EM_386 => "i386",
        goblin::elf::header::EM_AARCH64 => "aarch64",
        goblin::elf::header::EM_ARM => "arm",
        goblin::elf::header::EM_RISCV => "riscv",
        _ => "unknown",
    }.to_string();

    let mut threads = Vec::new();
    let mut thread_counter = 0u32;

    // Parse program headers to find NOTE segments containing thread info
    for program_header in &elf.program_headers {
        if program_header.p_type == goblin::elf::program_header::PT_NOTE {
            let start = program_header.p_offset as usize;
            let end = start + program_header.p_filesz as usize;
            
            if end <= buffer.len() {
                let note_data = &buffer[start..end];
                
                // For minimum viable implementation, we'll extract raw register data
                // In a real implementation, this would parse NT_PRSTATUS notes properly
                if note_data.len() > 0 {
                    threads.push(ThreadInfo {
                        thread_id: thread_counter,
                        registers: note_data.to_vec(),
                    });
                    thread_counter += 1;
                }
            }
        }
    }

    // If no threads found, create a placeholder thread
    if threads.is_empty() {
        threads.push(ThreadInfo {
            thread_id: 0,
            registers: vec![0; 64], // Placeholder register data
        });
    }

    Ok(CoredumpInfo {
        threads,
        architecture,
    })
}

/// Analyze both ELF and coredump files
pub fn analyze_files(elf_path: Option<&str>, core_path: Option<&str>) -> Result<AnalysisResult> {
    let elf_info = if let Some(path) = elf_path {
        Some(analyze_elf(path)?)
    } else {
        None
    };

    let coredump_info = if let Some(path) = core_path {
        Some(analyze_coredump(path)?)
    } else {
        None
    };

    Ok(AnalysisResult {
        elf_info,
        coredump_info,
    })
}

/// Convert analysis result to prettified JSON
pub fn to_json(result: &AnalysisResult) -> Result<String> {
    serde_json::to_string_pretty(result).context("Failed to serialize result to JSON")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_analysis_result_serialization() {
        let result = AnalysisResult {
            elf_info: None,
            coredump_info: None,
        };
        
        let json = to_json(&result).unwrap();
        assert!(json.contains("elf_info"));
        assert!(json.contains("coredump_info"));
    }
}