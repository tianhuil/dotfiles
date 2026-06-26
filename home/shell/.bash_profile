# Include .bashrc for interactive settings (aliases, prompt, etc.)
if [ -f "$HOME/.bashrc" ]; then
    . "$HOME/.bashrc"
fi

# BASH_ENV is sourced by non-interactive bash shells (scripts).
# Setting it here makes child scripts inherit .coreenv.
export BASH_ENV="$HOME/.coreenv"
