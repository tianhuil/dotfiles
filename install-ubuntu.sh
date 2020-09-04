# Set up users (https://www.cyberciti.biz/faq/how-to-disable-ssh-password-login-on-linux/)
# run these commands as root
useradd -m -s /bin/bash tianhuil
usermod -aG sudo tianhuil
cp ~/.ssh/authorized_keys /home/tianhuil/.ssh/

# Then need to disable sudo password
# https://askubuntu.com/questions/147241/execute-sudo-without-password

# And follow the instructions in the original article to allow only ssh login

# useful for debugging
su - tianhuil

# run these commands as user
sudo apt-get upgrade --fix-missing
sudo apt-get install ruby --fix-missing

# setup python
sudo apt-get install ipython --fix-missing

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
