# install brew
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"

brew install tmux
sudo gem install tmuxinator
brew install homebrew/completions/tmuxinator-completion

if [ -f "/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl" ]; then
	ln -s "/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl" /usr/local/bin/subl
fi
