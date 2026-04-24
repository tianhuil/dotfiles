######################################################################
# Install script for Ubuntu
# sh -c "$(curl -fsSL https://raw.githubusercontent.com/tianhuil/dotfiles/main/install-ubuntu.sh)"
######################################################################

set -e

git clone git@github.com:tianhuil/dotfiles.git

pushd $HOME/dotfiles
./setup.sh
popd

sudo apt update

# Essentials
sudo apt-get install -y git zsh tmux vim curl wget build-essential

# Python build deps + sqlite + libpq
sudo apt-get install -y make libssl-dev zlib1g-dev libbz2-dev \
  libreadline-dev libsqlite3-dev llvm libncurses5-dev libncursesw5-dev \
  xz-utils tk-dev libffi-dev liblzma-dev python3-openssl \
  sqlite3 libpq-dev

# eza (modern ls replacement)
sudo apt-get install -y gpg
sudo mkdir -p /etc/apt/keyrings
curl -sS https://raw.githubusercontent.com/eza-community/eza/main/deb.asc | sudo gpg --dearmor -o /etc/apt/keyrings/gieru.gpg
echo "deb [signed-by=/etc/apt/keyrings/gieru.gpg] http://deb.gieru.de stable main" | sudo tee /etc/apt/sources.list.d/gieru.list
sudo apt update
sudo apt-get install -y eza


# fzf
git clone --depth 1 https://github.com/junegunn/fzf.git ~/.fzf
~/.fzf/install --key-bindings --completion --no-update-rc --no-bash --no-fish

# zoxide
curl -sSfL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh

# zellij
curl -L https://github.com/zellij-org/zellij/releases/latest/download/zellij-x86_64-unknown-linux-musl.tar.gz | tar xz -C ~/.local/bin

# nvm + node
export NVM_DIR="$HOME/.nvm"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install --lts

# Go
curl -LO https://go.dev/dl/go1.24.1.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.24.1.linux-amd64.tar.gz
rm go1.24.1.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
go env -w GOPATH=$HOME/go

# Java (OpenJDK 21)
sudo apt-get install -y openjdk-21-jdk

# bun
curl -fsSL https://bun.sh/install | bash

# ngrok
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt-get install -y ngrok

# oh-my-zsh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# pyenv + poetry
curl https://pyenv.run | bash
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"
curl -sSL https://install.python-poetry.org | python3 -

echo "Done!"
