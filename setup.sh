cp home/.bashrc ~/.
cp home/.bashrc ~/.bash_profile
cp home/.inputrc ~/.
cp home/.zshrc ~/.
cp home/.zprofile ~/.zprofile
cp home/.corerc ~/.
cp home/.npmrc ~/.
cp home/.gitconfig ~/.
cp home/.tmux.conf ~/.
cp home/.stubby.yml ~/.
cp home/.git-completion.sh ~/.
cp home/.git-prompt.sh ~/.
cp home/.gitignore_global ~/.
cp home/.env.local ~/.

# Directories with perfect mapping
cp -R home/.cursor/ ~/.cursor/
cp -R home/.local/ ~/.local/
cp -R home/.nvm/ ~/.nvm/
cp -R home/.config/ ~/.config/
cp -R home/.scripts/ ~/.scripts/
cp -R home/.agents/ ~/.agents/

# SSH
mkdir -p ~/.ssh
cp home/.ssh/config ~/.ssh/config
cp home/.ssh/config.local ~/.ssh/config.local 2>/dev/null || true
cp home/.ssh/racknerd.pub ~/.ssh/racknerd.pub 2>/dev/null || true
chmod 600 ~/.ssh/config

# Git config
git config --global core.excludesfile ~/.gitignore_global

# Permissions
chmod +x ~/.local/bin/*

echo "Copied all dotfiles to home directory"
