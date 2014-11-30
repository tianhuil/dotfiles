sudo apt-get upgrade --fix-missing
sudo apt-get ruby --fix-missing

# setup virtual env
sudo apt-get install python-pip --fix-missing
pip install virtualenv
cd ~
virtualenv venv
. venv/bin/activate

# setup python
sudo apt-get install ipython --fix-missing

# setup tmux
sudo apt-get install tmux --fix-missing
gem install tmuxinator

# setup emacs
sudo apt-get install emacs --fix-missing
