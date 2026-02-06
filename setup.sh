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

# Directories with perfect mapping
cp -R home/.cursor/ ~/.cursor/
cp -R home/.kilocode/ ~/.kilocode/
cp -R home/.local/ ~/.local/
cp -R home/.nvm/ ~/.nvm/
cp -R home/.opencode/ ~/.config/opencode/
cp -R home/.scripts/ ~/.scripts/

# Git config
git config --global core.excludesfile ~/.gitignore_global

# Permissions
chmod +x ~/.local/bin/*

echo "Copied all dotfiles to home directory"
