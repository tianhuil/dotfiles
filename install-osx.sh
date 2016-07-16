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

# install java
brew tap caskroom/cask
brew install brew-cask
brew cask install java

# install spark
brew install apache-spark

# gitx
ln -s /Applications/GitX.app/Contents/Resources/gitx /usr/local/bin/gitx 

# instal google app engine
brew install google-app-engine
