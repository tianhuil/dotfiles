sudo apt-get upgrade
sudo apt-get ruby

# setup virtual env
sudo apt-get install python-pip
pip install virtualenv
cd ~
virtualenv venv
. venv/bin/activate

# setup tmux
sudo apt-get install tmux
gem install tmuxinator

# setup emacs
sudo apt-get install emacs
