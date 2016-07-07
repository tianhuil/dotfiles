# If we are not a login shell, source /etc/profile anyway
if [ "$0" != "-bash" ] ; then
    . /etc/profile
fi

if [ -f .git-completion.sh ]; then
    . .git-completion.sh
fi

if [ -f .git-prompt.sh ]; then
    . .git-prompt.sh
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
export JAVA_HOME=$(/usr/libexec/java_home)

### Add in for Spark
export SCALA_HOME=/usr/local/Cellar/scala/2.11.4/
if which pyspark > /dev/null; then
  export SPARK_HOME="/usr/local/Cellar/apache-spark/1.5.2/libexec/"
  export PYSPARK_SUBMIT_ARGS="--master local[2]"
fi
export PATH=$PATH:$SCALA_HOME/bin

# NPM
export NPM_PACKAGES="/Users/michael/.npm"
export NODE_PATH="$NPM_PACKAGES/lib/node_modules:$NODE_PATH"
export PATH="$NPM_PACKAGES/bin:$PATH"
