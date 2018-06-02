# Install brew
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

# Install node and npm from https://gist.github.com/DanHerbert/9520689
rm -rf /usr/local/lib/node_modules
brew uninstall node
brew install node --without-npm
curl -L https://www.npmjs.com/install.sh | sh
