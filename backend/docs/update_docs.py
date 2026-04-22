import os
import re
from pathlib import Path

# Paths to the documentation files
DOCS = [
    r"c:\Users\ADMIN\.gemini\antigravity\brain\7ef816bc-69f2-42dd-a676-1d2fbf894474\orbisave_build_phases.md",
    r"c:\Users\ADMIN\Desktop\Orbisave App\orbisave\docs\phase_1_completion.md",
    r"c:\Users\ADMIN\Desktop\Orbisave App\orbisave\OrbiSave_Master_Build_Prompt.md",
    r"c:\Users\ADMIN\Desktop\Orbisave App\orbisave\OrbiSave Financial Infrastructure.txt",
    r"c:\Users\ADMIN\Desktop\Orbisave App\orbisave\Orbisave Core Platform Architecture.txt",
    r"c:\Users\ADMIN\Desktop\Orbisave App\orbisave\OrbiSave Technical Master Blueprint.txt",
]

def update_file(filepath):
    if not os.path.exists(filepath):
        print(f"Skipping {filepath}, does not exist.")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replacements for Better Auth
    # Replace references to NextAuth or pure SimpleJWT auth flow with Better Auth
    content = re.sub(
        r"NextAuth\.js|NextAuth", 
        "Better Auth", 
        content,
        flags=re.IGNORECASE
    )
    
    # We clarify how Better Auth works
    if "Better Auth" in content and "session manager" not in content:
        # A simple naive injection to ensure Better Auth is described correctly
        content = content.replace("Better Auth", "Better Auth (Next.js session manager via RS256 JWT from Django)")
        # Fix double injections
        content = content.replace("Better Auth (Next.js session manager via RS256 JWT from Django) (Next.js session manager via RS256 JWT from Django)", "Better Auth (Next.js session manager via RS256 JWT from Django)")

    # Replacements for Multi-DB
    if "multi-database" not in content.lower():
        content = content.replace(
            "PostgreSQL 16", 
            "PostgreSQL 16 (Multi-database routing: default for platform, separate logical DBs for Kenya, Rwanda, Ghana)"
        )
        content = content.replace(
            "single database",
            "multi-database routing (using() pattern with OrbiSaveRouter and CountryMiddleware)"
        )
        
    # Replacements for Audit Integrity
    if "Merkle root" not in content:
        content = content.replace(
            "LedgerEntry",
            "LedgerEntry (with previous_state/new_state JSON, PostgreSQL trigger-level immutability, Daily Merkle root checkpointing, and off-chain signed daily S3 exports)"
        )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Updated {filepath}")

for doc in DOCS:
    update_file(doc)
