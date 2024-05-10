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

echo "Copied all dotfiles to home directory"
