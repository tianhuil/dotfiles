This is a repository of useful "dot files" for unix.
----------------------------------------------------

To load the .bashrc, .inputrc, and bash completions, run (this will overwrite .bashrc etc ...):

```setup.sh```

To install some of the basics (required by .bashrc), run:

```install.sh```

To install python libraries (not required), first run above then run:

```pip install -r requirements.txt```

How to setup a new Ubuntu server
--------------------------------

1. Login as root and create a new user with `sudo` permissions.  From [these instructions](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-16-04)

```
mkdir -p /home/vagrant/.ssh
touch /home/vagrant/.ssh/authorized_keys  # or perhaps copy from root
useradd -d /home/vagrant vagrant
usermod -aG sudo vagrant

chown -R vagrant:vagrant /home/vagrant/
chmod 700 /home/vagrant/.ssh
chmod 644 /home/vagrant/.ssh/authorized_keys
```

Disable password authentication

```sudo nano /etc/ssh/sshd_config```
by setting
```
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
```
and then running

```systemctl reload sshd```

2. Disable password for quick sudo
```
passwd -d vagrant
```

3. Set bash as the default shell by adding it to **the last field** of the vagrant line in `/etc/passwd`
(here's a sample `vagrant:x:1000:1000::/home/vagrant:/bin/bash`).

4. `git clone` dotfiles and run the commands in the first section.

5. [Optional] Mount a volume [article](https://www.digitalocean.com/community/tutorials/how-to-use-block-storage-on-digitalocean#creating-and-attaching-volumes)

Where you need to specify the volume mount by looking up the volume name from the DO dashboard.

```
export VOLUME=volume-nyc3-02

sudo parted /dev/disk/by-id/scsi-0DO_Volume_$VOLUME mklabel gpt
sudo parted -a opt /dev/disk/by-id/scsi-0DO_Volume_$VOLUME mkpart primary ext4 0% 100%
sudo mkfs.ext4 /dev/disk/by-id/scsi-0DO_Volume_$VOLUME-part1
sudo mkdir -p /mnt/$VOLUME-part1
echo "/dev/disk/by-id/scsi-0DO_Volume_$VOLUME-part1 /mnt/$VOLUME-part1 ext4 defaults,nofail,discard 0 2" | sudo tee -a /etc/fstab
sudo mount -a
```
