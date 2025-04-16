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
cp git-completion.sh ~/.git-completion.sh
cp git-prompt.sh ~/.git-prompt.sh
cp -R .scripts ~/.
cp .gitignore_global ~/.
# create ~/.nvm if it doesn't exist
[ ! -d ~/.nvm ] && mkdir -p ~/.nvm
cp .nvm.default-packages ~/.nvm/default-packages
git config --global core.excludesfile ~/.gitignore_global

# copy cursor rules
mkdir -p ~/.local/share/dotfiles
cp -R local-share/.cursor-rules-typescript ~/.local/share/dotfiles/.cursor-rules-typescript
cp local-share/.vscode-settings.json ~/.local/share/dotfiles/.vscode-settings.json
cp local-share/biome.json ~/.local/share/dotfiles/biome.json

# copy local-bin to ~/.local/bin
mkdir -p ~/.local/bin
cp -R local-bin/* ~/.local/bin
chmod +x ~/.local/bin/*

echo "Copied all dotfiles to home directory"
