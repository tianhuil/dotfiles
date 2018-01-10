sudo apt-get upgrade --fix-missing
sudo apt-get install ruby --fix-missing

# setup python
sudo apt-get install ipython --fix-missing

# setup anaconda
pushd /tmp/
curl -O https://repo.continuum.io/archive/Anaconda2-5.0.1-Linux-x86_64.sh
./Anaconda2-5.0.1-Linux-x86_64.sh
popd

# setup tmux
sudo apt-get install tmux --fix-missing
gem install tmuxinator

# setup emacs
sudo apt-get install emacs --fix-missing
