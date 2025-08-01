use anyhow::Result;
use clap::Parser;
use himmel::{analyze_files, to_json};

#[derive(Parser)]
#[command(name = "himmel")]
#[command(about = "A CLI tool for analyzing ELF files using DWARF info")]
#[command(version = "0.1.0")]
struct Args {
    /// Path to ELF file to analyze
    #[arg(long, value_name = "FILE")]
    elf: Option<String>,

    /// Output format (currently only JSON is supported)
    #[arg(long, default_value = "json")]
    format: String,
}

fn main() -> Result<()> {
    let args = Args::parse();

    // Validate that ELF file is provided
    if args.elf.is_none() {
        eprintln!("Error: ELF file (--elf) must be provided");
        std::process::exit(1);
    }

    // Validate format
    if args.format != "json" {
        eprintln!("Error: Only 'json' format is currently supported");
        std::process::exit(1);
    }

    match analyze_files(args.elf.as_deref()) {
        Ok(result) => {
            let json_output = to_json(&result)?;
            println!("{json_output}");
        }
        Err(e) => {
            eprintln!("Error: {e}");
            std::process::exit(1);
        }
    }

    Ok(())
}
