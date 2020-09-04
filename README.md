## This is a repository of useful "dot files" for unix.

To load the .bashrc, .inputrc, and bash completions, run (this will overwrite .bashrc etc ...):

`setup.sh`

To install some of the basics (required by .bashrc), run:

`install.sh`

To install python libraries (not required), first run above then run:

`pip install -r requirements.txt`

## How to setup a new Ubuntu server

### Step 1.

Login as root and create a new user with `sudo` permissions. From [these instructions](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-16-04)

```bash
export USER=tianhuil

mkdir -p /home/$USER/.ssh
touch /home/$USER/.ssh/authorized_keys
cp /root/.ssh/authorized_keys /home/$USER/.ssh/authorized_keys  # or perhaps copy from root
useradd -d /home/$USER $USER
usermod -aG sudo $USER

chown -R $USER:$USER /home/$USER/
chmod 700 /home/$USER/.ssh
chmod 644 /home/$USER/.ssh/authorized_keys
```

Disable password authentication

```bash
sudo nano /etc/ssh/sshd_config
```

by setting

```
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
```

and then running

```bash
systemctl reload sshd
```

You should ssh into the server as `tianhuil` to check that this worked correctly.

This might be a useful command while working as root

```bash
su - $USER
```

### Step 2.

Disable password for quick sudo

```
passwd -d $USER  # Disable password for quick sudo
```

To test this, run the following as `tianhuil`:

```bash
sudo ls /root/
```

**Note:** If the above was insufficient, try following [this recommendation](https://askubuntu.com/questions/930944/how-to-disable-all-permissions-and-sudo-password-requirements) and [this one](https://askubuntu.com/questions/675379/how-to-disable-the-password-prompts) by running `sudo visudo` and changing this line

```
%sudo   ALL=(ALL:ALL) ALL
```

to this line

```
%sudo  ALL=(ALL) NOPASSWD:ALL
```

This disables passwords for users in the sudo group.

### Step 3.

Set bash as the default shell by adding it to **the last field** of the `$USER` line in `/etc/passwd`
(here's a sample `tianhuil:x:1000:1000::/home/tianhuil:/bin/bash`).

### Step 4.

SSH in as `$USER` and `git clone` dotfiles and run the commands in the first section:

```
git clone https://github.com/tianhuil/dotfiles.git
```

### Step 5.

Setup SSH key for github: (following [these instructions](https://help.github.com/articles/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent/))

```
ssh-keygen -t rsa -b 4096 -C "tianhuil@cs.princeton.edu"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa
```

Then copy the contents of `cat ~/.ssh/id_rsa.pub` from the screen to [your settings page](https://github.com/settings/keys)

### Step 6.

Mount a volume from the DO dashboard. It is mounted in `/mnt/xxx` where `xxx` is the name of the volume.

### Step 7.

Enable firewall based on [these instructions](https://www.digitalocean.com/community/tutorials/how-to-setup-a-firewall-with-ufw-on-an-ubuntu-and-debian-cloud-server)

Check that the firewall is currently inactive

```bash
sudo ufw status
```

and then configure the wirewall to only allow incoming ssh

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
```

Finally, enable the firewall and see the reuslts

```bash
sudo ufw enable
sudo ufw status verbose
```
