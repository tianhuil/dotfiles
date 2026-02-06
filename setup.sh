cp .bashrc ~/.
cp .bashrc ~/.bash_profile
cp .inputrc ~/.
cp .zshrc ~/.
cp .zprofile ~/.zprofile
cp .corerc ~/.
cp .npmrc ~/.
cp .gitconfig ~/.
cp .tmux.conf ~/.
cp .stubby.yml ~/.
cp .cursor-mcp.json ~/.
cp .git-completion.sh ~/.
cp .git-prompt.sh ~/.
cp .gitignore_global ~/.

# Directories with perfect mapping
cp -R .cursor/ ~/.cursor/
cp -R .kilocode/ ~/.kilocode/
cp -R .local/ ~/.local/
cp -R .nvm/ ~/.nvm/
cp -R .opencode/ ~/.config/opencode/
cp -R .scripts/ ~/.scripts/

# Special cases
cp .cursor-mcp.json ~/.cursor/mcp.json
cp .opencode.json ~/.config/opencode/opencode.json

# Git config
git config --global core.excludesfile ~/.gitignore_global

# Permissions
chmod +x ~/.local/bin/*

echo "Copied all dotfiles to home directory"
