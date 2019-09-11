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
