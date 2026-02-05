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
cp .cursor-mcp.json ~/.cursor-mcp.json
cp .cursor-mcp.json ~/.cursor/mcp.json
# create ~/.kilocode if it doesn't exist
[ ! -d ~/.kilocode ] && mkdir -p ~/.kilocode
cp .kilocode/config.json ~/.kilocode/config.json
cp .git-completion.sh ~/.git-completion.sh
cp .git-prompt.sh ~/.git-prompt.sh
cp -R .scripts ~/.
cp .gitignore_global ~/.
# create ~/.nvm if it doesn't exist
[ ! -d ~/.nvm ] && mkdir -p ~/.nvm
cp .nvm.default-packages ~/.nvm/default-packages
git config --global core.excludesfile ~/.gitignore_global

# copy cursor rules
mkdir -p ~/.local/share/dotfiles
cp -f local-share/.cursor-rules-typescript/* ~/.local/share/dotfiles/.cursor-rules-typescript/.
cp -f local-share/.vscode-settings.json ~/.local/share/dotfiles/.vscode-settings.json
cp -f local-share/biome.json ~/.local/share/dotfiles/biome.json

# copy local-bin to ~/.local/bin
mkdir -p ~/.local/bin
cp -R local-bin/* ~/.local/bin
chmod +x ~/.local/bin/*

# copy cursor commands
mkdir -p ~/.cursor/commands
cp -f .cursor-commands/*.md ~/.cursor/commands/

# copy opencode config
mkdir -p ~/.config/opencode
cp -f .opencode.json ~/.config/opencode/opencode.json

# copy opencode commands
mkdir -p ~/.config/opencode/commands
cp -f .opencode/commands/*.md ~/.config/opencode/commands/

# copy opencode agents
mkdir -p ~/.config/opencode/agents
cp -f .opencode/agents/*.md ~/.config/opencode/agents/

echo "Copied all dotfiles to home directory"
