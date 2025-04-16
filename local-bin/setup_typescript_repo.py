#!/usr/bin/env python3

import os
import sys
import shutil
from pathlib import Path

def check_git_repo():
    if not Path('.git').is_dir():
        print("Error: Not in a git repository root directory", file=sys.stderr)
        sys.exit(1)

def copy_file(src_path, dst_path):
    if not src_path.is_file():
        print(f"Error: Source file '{src_path}' not found", file=sys.stderr)
        sys.exit(1)
    
    shutil.copy2(src_path, dst_path)

def copy_cursor_rules():
    # Check if we're in a git repo
    check_git_repo()
    
    # Define source and destination directories
    source_dir = Path.home() / '.local' / 'share' / 'dotfiles' / '.cursor-rules-typescript'
    dest_dir = Path.cwd() / '.cursor' / 'rules'
    
    # Check if source directory exists
    if not source_dir.is_dir():
        print(f"Error: Source directory '{source_dir}' not found", file=sys.stderr)
        sys.exit(1)
    
    # Remove destination directory if it exists
    if dest_dir.exists():
        shutil.rmtree(dest_dir)
    
    # Create destination directory
    dest_dir.mkdir(parents=True)
    
    # Count for reporting
    copied_files = 0
    
    try:
        # Walk through the source directory
        for src_path in source_dir.glob('*.md'):
            # Calculate relative path to maintain directory structure
            rel_path = src_path.relative_to(source_dir)
            dst_path = dest_dir / rel_path
            
            copy_file(src_path, dst_path)
            copied_files += 1
        
        print(f"\nSuccess: Copied {copied_files} rule files to {dest_dir}")
        
    except Exception as e:
        print(f"Error during copy operation: {str(e)}", file=sys.stderr)
        sys.exit(1)

def copy_vscode_settings():
    source_path = Path.home() / '.local' / 'share' / 'dotfiles' / '.vscode-settings.json'
    dest_path = Path.cwd() / '.vscode' / 'settings.json'
    copy_file(source_path, dest_path)
    print(f"Success: Copied vscode settings to {dest_path}")

def copy_biome_settings():
    source_path = Path.home() / '.local' / 'share' / 'dotfiles' / 'biome.json'
    dest_path = Path.cwd() / 'biome.json'
    copy_file(source_path, dest_path)
    print(f"Success: Copied biome settings to {dest_path}")

if __name__ == '__main__':
    copy_cursor_rules()
    copy_vscode_settings()
    copy_biome_settings()