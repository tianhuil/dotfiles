# Partition a case-sensitive volume at /Volumes/Workspace
# https://brianboyko.medium.com/a-case-sensitive-src-folder-for-mac-programmers-176cc82a3830

# Software to download
# Dropbox
# 1password (password file)
# SizeUp (license)
# Chrome
# Vscode
# run "shell command" from the command pallette to install 'code' shell command
# Slack
# Notion

# Install brew
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"

# tmux
brew install tmux

# Github Cli
brew install gh 

# DNS security
brew install stubby
# follow instructions on https://gist.github.com/uraimo/c651cbf3477994f95d8dbc7c60031697
# and run `sudo stubby -h` and `studo stubby -i` to confirm that the config file is processed properly.

# setup source tree
if [ -f "/Applications/SourceTree.app/Contents/Resources/stree" ]; then
  sudo ln -s /Applications/SourceTree.app/Contents/Resources/stree /usr/local/bin/stree
fi

# gitx
ln -s /Applications/GitX.app/Contents/Resources/gitx /usr/local/bin/gitx

# Install google app engine
brew install google-app-engine

# Install Poetry
curl -sSL https://install.python-poetry.org | python3 -

# Install Pyenv
brew install pyenv


# Install gpg
brew install gpg


# Install go
brew install go

brew install ngrok

# Fix pbcopy https://github.com/ChrisJohnsen/tmux-MacOSX-pasteboard
brew install reattach-to-user-namespace

# Fiddle with settings
# Option as Meta for VSCocde: https://github.com/microsoft/vscode/issues/101136#issuecomment-674115967
# Option as Meta for iterm2: set option key as "Esc+" in settings -> profiles -> keys (see https://iterm2.com/faq.html)

# nvm
# https://github.com/nvm-sh/nvm#calling-nvm-use-automatically-in-a-directory-with-a-nvmrc-file
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts --latest-npm # install latest lts and npm

# 1password cli
brew install 1password-cli

##############################################################################
# Optional

# A new bug in tmux / OSX forces us to do this:
# http://stackoverflow.com/questions/25718021/sublime-text-no-longer-launches-from-terminal
brew install reattach-to-user-namespace

# Install java for M1
# https://stackoverflow.com/a/66891978/8930600
brew install openjdk

# Install spark
brew install scala
brew install apache-spark

# Install GCloud
brew install --cask google-cloud-sdk
echo "Be sure to symlink gcloud"
echo "sudo ln -s /usr/local/Caskroom/google-cloud-sdk/latest/google-cloud-sdk/bin/gcloud /usr/local/bin/gcloud"

# Bash autocomplete
brew install bash-completion

xcode-select --install

# Install Latex
brew cask install mactex

# parallel
brew install parallel

# tidy
brew install tidy-html5

# pnpm + bun
brew install pnpm
brew install oven-sh/bun/bun

# libpq
brew install libpq

# sqlite
brew install sqlite

# uv
brew install uv

# rust
brew install rust

# Add the following Keybindings to keybindings.json in VSCode
# {
#   "key": "alt+f",
#   "command": "cursorWordPartRight",
#   "when": "textInputFocus"
# },
# {
#   "key": "alt+b",
#   "command": "cursorWordPartLeft",
#   "when": "textInputFocus"
# },
# {
#   "key": "alt+f",
#   "command": "workbench.action.terminal.sendSequence",
#   "args": {
#     "text": "\u001bf"
#   },
#   "when": "terminalFocus"
# },
# {
#   "key": "alt+b",
#   "command": "workbench.action.terminal.sendSequence",
#   "args": {
#     "text": "\u001bb"
#   },
#   "when": "terminalFocus"
# }

# Follow instructions here (https://stackoverflow.com/a/345949/8930600)
# to set up alt+b and alt+f for word navigation in iterm2
