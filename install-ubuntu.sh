# To set up a new user, see README.md

# run these commands as user
sudo apt-get upgrade --fix-missing
sudo apt-get install ruby --fix-missing -y

### Basic build tools needed for installing Python
sudo apt install update -y
sudo apt install build-essential zlib1g-dev libssl-dev libbz2-dev \
    libreadline-dev libsqlite3-dev python3 python3-dev python3-venv python3-wheel -y

# for scientific python
sudo apt-get install libatlas-base-dev libblas3 liblapack3 liblapack-dev \
    libblas-dev gfortran pkg-config -y

# Alternatively, setup python using pyenv -- although the above is probably good enough
# (already added to $PATH) https://github.com/pyenv/pyenv-installer
curl https://pyenv.run | bash

# Install poetry (already added to $PATH)
curl -sSL https://raw.githubusercontent.com/python-poetry/poetry/master/get-poetry.py | python3

# install Make
sudo apt install make

# setup Spark - from https://spark.apache.org/downloads.html
pushd /tmp/
curl -O http://apache.mirrors.tds.net/spark/spark-2.4.4/spark-2.4.4-bin-hadoop2.7.tgz
tar xvf spark-2.4.4-bin-hadoop2.7.tgz
sudo mv spark-2.4.4-bin-hadoop2.7 /opt/spark
popd /tmp/

cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys  # allow self login for Spark

# Use Java 8 (for Spark) - from https://stackoverflow.com/a/56091229/8930600
sudo apt install openjdk-8-jdk
sudo update-alternatives --config java  # manually select java 8 option
java -version # should see 'openjdk version "1.8.0_191"'


# setup tmux
gem install tmuxinator

# install go
sudo apt install golang-go

# setup emacs
sudo apt-get install emacs --fix-missing
