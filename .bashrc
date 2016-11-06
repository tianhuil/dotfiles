# If we are not a login shell, source /etc/profile anyway
if [ "$0" != "-bash" ] ; then
    . /etc/profile
fi

if [ -f ~/.git-completion.sh ]; then
    . ~/.git-completion.sh
fi

if [ -f ~/.git-prompt.sh ]; then
    . ~/.git-prompt.sh
fi

export HISTSIZE=1000000
export HISTIGNORE="&:ls:[bf]g:exit"
export HISTCONTROL=erasedups
shopt -s histappend  # Append to, rather than overwite, to history on disk
PROMPT_COMMAND='history -a' # Write the history to disk whenever you display the prompt

alias ipy='ipython --pdb'
alias qtconsole='"ipython" qtconsole --pylab=inline'

alias rm='rm -i'
alias cp='cp -i'
alias mv='mv -i'
alias mkdir='mkdir -p' # make parent directories as needed

alias less='less -R'
alias more='more -R'

alias ls='ls -h -G'
alias ll='ls -l'
alias la='ls -A'
alias l='ls -CF'
alias svim='sudo vim'
alias h='cd'
alias ..='cd ..'
alias cd..='cd ..'
alias ...='cd ../..'
alias cim='vim'
alias back='cd $OLDPWD'
alias root='sudo su'
alias runlevel='sudo /sbin/init'
alias grep='grep --color=auto'
alias dfh='df -h'
alias gvim='gvim -geom 84x26'
alias start='dbus-launch startx'
alias sha1='openssl sha1'

export VISUAL=emacs;
export EDITOR=emacs;

### Add java variable:
if [ -f /usr/libexec/java_home ]; then
  export JAVA_HOME=$(/usr/libexec/java_home)
fi


if [[ "$OSTYPE" == "linux-gnu" ]]; then  # Ubuntu
  if [ -f /etc/bash_completion ]; then
    . /etc/bash_completion
  fi
elif [[ "$OSTYPE" == "darwin"* ]]; then  # OSX
  # NPM
  export PATH="$PATH:/usr/local/Cellar/node/6.3.0/libexec/npm/bin"

  export PS1="MBP3 \t ${GREEN}\W${RESET}$ "
  export PS2='> '

  # tidy
  TIDY_PATH=`brew info tidy-html5 | grep /usr/local | cut -f1 -d" "`
  alias tidy='$TIDY_PATH/bin/tidy'

  if [ -f $(brew --prefix)/etc/bash_completion ]; then
    . $(brew --prefix)/etc/bash_completion
  fi

  # hack fix for subl
  # http://stackoverflow.com/questions/25718021/sublime-text-no-longer-launches-from-terminal
  alias subl='reattach-to-user-namespace /usr/local/bin/subl'
fi

# GAEPATH
APPCFG=`which appcfg.py`
FULL_PATH=`perl -MCwd -le 'print Cwd::abs_path(shift)' $APPCFG`
export GAEPATH=`dirname $FULL_PATH`

function clean-docker() {
  # Clean docker
  if [[ $(docker ps -a -q) ]]; then
    docker rm $(docker ps -a -q)
  fi

  if [[ $(docker images -q) ]] ; then
    docker rmi $(docker images -q)
  fi

  if [[ $(docker volume ls -q |awk '{print $2}') ]] ; then
    docker volume rm $(docker volume ls -q |awk '{print $2}')
  fi
  if [[ "$OSTYPE" == "darwin" ]]; then  # OSX
    rm -rf ~/Library/Containers/com.docker.docker/Data/*
  fi
}

