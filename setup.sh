cp .bashrc ~/.
cp .inputrc ~/.
cp .npmrc ~/.
cp .gitignore_global ~/.
git config --global core.excludesfile ~/.gitignore_global
cp .gitconfig ~/.
cp .tmux.conf ~/.
cp git-completion.sh ~/.git-completion.sh
cp git-prompt.sh ~/.git-prompt.sh
cp -R .scripts ~/.
chmod u+x ~/*