sudo apt-get upgrade --fix-missing
sudo apt-get install ruby --fix-missing

# setup virtual env
sudo apt-get install python-pip --fix-missing
pip install virtualenv
virtualenv ~/venv
. ~/venv/bin/activate
pip install -r requirements.txt

# setup python
sudo apt-get install ipython --fix-missing

# setup tmux
sudo apt-get install tmux --fix-missing
gem install tmuxinator

# setup emacs
sudo apt-get install emacs --fix-missing
