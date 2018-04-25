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

if [ -x "$(command -v emacs)" ]; then
  export VISUAL=emacs
  export EDITOR=emacs
else
  export VISUAL=vi
  export EDITOR=vi
fi

# Add java variable: (25 ms)
if [ -f /usr/libexec/java_home ]; then
  export JAVA_HOME=$(/usr/libexec/java_home)
fi


if [[ "$OSTYPE" == "linux-gnu" ]]; then  # Ubuntu
  if [ -f /etc/bash_completion ]; then
    . /etc/bash_completion
  fi
elif [[ "$OSTYPE" == "darwin"* ]]; then  # OSX
  export PS1="MBP3 \t ${GREEN}\W${RESET}$ "
  export PS2='> '

  # brew --prefix to path
  export BREW_PREFIX=$(brew --prefix)  # 30 ms
  export PATH=$BREW_PREFIX/bin:$BREW_PREFIX/sbin:$PATH

  if [ -f $BREW_PREFIX/etc/bash_completion ]; then
    source $BREW_PREFIX/etc/bash_completion  # 400 ms
  fi

  # hack fix for subl
  # http://stackoverflow.com/questions/25718021/sublime-text-no-longer-launches-from-terminal
  alias subl='reattach-to-user-namespace /usr/local/bin/subl'
fi


export GOPATH=$(go env GOPATH)  # 80 ms
export PATH=$PATH:$GOPATH/bin

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

if [[ "$OSTYPE" == "darwin" ]]; then  # OSX
  ln -s /Library/TeX/Distributions/.DefaultTeX/Contents/Programs/texbin/pdflatex /usr/local/bin
fi

# Add Anaconda to path
if [ -d "$HOME/anaconda2/bin" ]; then
  export PATH=$HOME/anaconda2/bin:$PATH
fi

# GAEPATH
FULL_PATH=`command -v gcloud`
export GCLOUD_PATH="$(dirname "$FULL_PATH")/../"
export GAEPATH="$GCLOUD_PATH/lib/third_party"

# Add G-Cloud to path
if [ -f $GCLOUD_PATH/path.bash.inc ]; then
  source '$GCLOUD_PATH/path.bash.inc'
fi

if [ -f $GCLOUD_PATH//completion.bash.inc ]; then
  source '$GCLOUD_PATH//completion.bash.inc'
fi


