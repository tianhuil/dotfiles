# Install brew
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
# run the command to add it to .zprofile (which appear at the end of installaiton)

# Software to download
# Dropbox
# 1password (password file)
# SizeUp (license)
# Chrome
# Vscode
# run "shell command" from the command pallette to install 'code' shell command
# Slack
# node: https://nodejs.org/en/download/

# tmux
brew install tmux
sudo gem install tmuxinator
brew install homebrew/completions/tmuxinator-completion

# setup source tree
if [ -f "/Applications/SourceTree.app/Contents/Resources/stree" ]; then
  ln -s /Applications/SourceTree.app/Contents/Resources/stree /usr/local/bin/stree
fi


# A new bug in tmux / OSX forces us to do this:
# http://stackoverflow.com/questions/25718021/sublime-text-no-longer-launches-from-terminal
brew install reattach-to-user-namespace

# Install java
brew tap caskroom/cask
brew install brew-cask
brew cask install java

# Install spark
brew install scala
brew install apache-spark

# Install GCloud
brew cask install google-cloud-sdk
echo "Be sure to symlink gcloud"
echo "sudo ln -s /usr/local/Caskroom/google-cloud-sdk/latest/google-cloud-sdk/bin/gcloud /usr/local/bin/gcloud"

# gitx
ln -s /Applications/GitX.app/Contents/Resources/gitx /usr/local/bin/gitx

# Install google app engine
brew install google-app-engine

# Install Poetry
curl -sSL https://raw.githubusercontent.com/python-poetry/poetry/master/get-poetry.py | python

# Install Pyenv
git clone https://github.com/pyenv/pyenv.git ~/.pyenv

# tidy
brew install tidy-html5

# Install gpg
brew install gpg

# parallel
brew install parallel

# Bash autocomplete
brew install bash-completion

xcode-select --install

# Install Latex
brew cask install mactex

# Install go
brew install go

echo "Download https://ngrok.com/download and move into ~/Applications/ngrok"

# Fix pbcopy https://github.com/ChrisJohnsen/tmux-MacOSX-pasteboard
brew install reattach-to-user-namespace

# Fiddle with settings
# Option as Meta for VSCocde: https://github.com/microsoft/vscode/issues/101136#issuecomment-674115967
# Option as Meta for iterm2: set option key as "Esc+" in settings -> profiles -> keys (see https://iterm2.com/faq.html)
