#!/usr/bin/env python3

import os
import sys
import shutil
from pathlib import Path

def check_git_repo():
    if not Path('.git').is_dir():
        print("Error: Not in a git repository root directory", file=sys.stderr)
        sys.exit(1)

def sync_rules():
    # Check if we're in a git repo
    check_git_repo()
    
    # Define source and destination directories
    source_dir = Path.home() / '.cursor-rules-typescript'
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
            
            # Copy the file
            shutil.copy2(src_path, dst_path)
            copied_files += 1
            print(f"Copied: {rel_path}")
        
        print(f"\nSuccess: Copied {copied_files} rule files to {dest_dir}")
        
    except Exception as e:
        print(f"Error during copy operation: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    sync_rules()