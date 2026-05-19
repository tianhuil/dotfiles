SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

cp "$SCRIPT_DIR/home/.bashrc" ~/.
cp "$SCRIPT_DIR/home/.bashrc" ~/.bash_profile
cp "$SCRIPT_DIR/home/.inputrc" ~/.
cp "$SCRIPT_DIR/home/.zshrc" ~/.
cp "$SCRIPT_DIR/home/.zprofile" ~/.zprofile
cp "$SCRIPT_DIR/home/.corerc" ~/.
cp "$SCRIPT_DIR/home/.npmrc" ~/.
cp "$SCRIPT_DIR/home/.gitconfig" ~/.
cp "$SCRIPT_DIR/home/.tmux.conf" ~/.
cp "$SCRIPT_DIR/home/.stubby.yml" ~/.
cp "$SCRIPT_DIR/home/.git-completion.sh" ~/.
cp "$SCRIPT_DIR/home/.git-prompt.sh" ~/.
cp "$SCRIPT_DIR/home/.gitignore_global" ~/.
cp "$SCRIPT_DIR/home/.env.local" ~/. 2>/dev/null || true

mkdir -p ~/.cursor ~/.local ~/.nvm ~/.config ~/.scripts ~/.agents

for dir in .cursor .local .nvm .config .scripts .agents; do
  if [ -d "$SCRIPT_DIR/home/$dir" ] && ls "$SCRIPT_DIR/home/$dir"/* >/dev/null 2>&1; then
    cp -R "$SCRIPT_DIR/home/$dir"/* ~/$dir/
  fi
done

# SSH
mkdir -p ~/.ssh
cp "$SCRIPT_DIR/home/.ssh/config" ~/.ssh/config
cp "$SCRIPT_DIR/home/.ssh/config.local" ~/.ssh/config.local 2>/dev/null || true
cp "$SCRIPT_DIR/home/.ssh/racknerd.pub" ~/.ssh/racknerd.pub 2>/dev/null || true
chmod 600 ~/.ssh/config

# Git config
git config --global core.excludesfile ~/.gitignore_global

# Permissions
if ls ~/.local/bin/* >/dev/null 2>&1; then
  chmod +x ~/.local/bin/*
fi

# Build local plugins
if [ -d ~/.config/opencode/plugins/open-queue ]; then
  cd ~/.config/opencode/plugins/open-queue && bun install && bun run build
fi

echo "Copied all dotfiles to home directory"
