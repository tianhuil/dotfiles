######################################################################
# Install script for Ubuntu 20.04
# sh -c "$(curl -fsSL https://raw.githubusercontent.com/tianhuil/dotfiles/main/install-ubuntu.sh)"
######################################################################

git clone git@github.com:tianhuil/dotfiles.git

pushd $HOME/dotfiles
./setup.sh
popd

sudo apt update
sudo apt-get install -y git zsh 
sudo apt install -y make build-essential libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm libncurses5-dev libncursesw5-dev xz-utils tk-dev libffi-dev liblzma-dev python3-openssl

sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

curl https://pyenv.run | bash
curl -sSL https://install.python-poetry.org | python3 -
