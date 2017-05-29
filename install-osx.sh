# install brew
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"

# Software to download
# Dropbox
# 1password (password file)
# SizeUp (license)
# Chrome
# Sublime
# Slack

# tmux
brew install tmux
sudo gem install tmuxinator
brew install homebrew/completions/tmuxinator-completion

# setup sublime
if [ -f "/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl" ]; then
	ln -s "/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl" /usr/local/bin/subl
fi

if [ -f "/Applications/SourceTree.app/Contents/Resources/stree" ]; then
  ln -s /Applications/SourceTree.app/Contents/Resources/stree /usr/local/bin/stree
fi


# A new bug in tmux / OSX forces us to do this:
# http://stackoverflow.com/questions/25718021/sublime-text-no-longer-launches-from-terminal
brew install reattach-to-user-namespace

# install java
brew tap caskroom/cask
brew install brew-cask
brew cask install java

# install spark
brew install scala
brew install apache-spark

# gitx
ln -s /Applications/GitX.app/Contents/Resources/gitx /usr/local/bin/gitx 

# instal google app engine
brew install google-app-engine

# tidy
brew install tidy-html5

# gpg
brew install gpg

# parallel
brew install parallel

# Bash autocomplete
brew install bash-completion

xcode-select --install

# Latex
brew cask install mactex

# Install go
brew install go
