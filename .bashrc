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

if [ -d /opt/spark ]; then
  export SPARK_HOME=/opt/spark
  export PATH=$PATH:$SPARK_HOME/bin:$SPARK_HOME/sbin  # spark packages should have lower priority
fi

export HISTSIZE=1000000
export HISTIGNORE="&:ls:[bf]g:exit"
export HISTCONTROL=erasedups
shopt -s histappend  # Append to, rather than overwite, to history on disk
PROMPT_COMMAND='history -a' # Write the history to disk whenever you display the prompt

. ~/.corerc

# Add G-Cloud to path
if [ -f $GCLOUD_PATH/path.bash.inc ]; then
  source $GCLOUD_PATH/path.bash.inc  # 20ms
fi

if [ -f $GCLOUD_PATH//completion.bash.inc ]; then
  source $GCLOUD_PATH//completion.bash.inc  # 15 ms
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
fi

# GAEPATH
if [ -L "$(command -v gcloud)" ]; then
  FULL_PATH=$(readlink $(command -v gcloud))
else
  FULL_PATH=$(command -v gcloud)
fi
export GCLOUD_PATH="$(dirname "$FULL_PATH")/../"
export GAEPATH="$GCLOUD_PATH/platform/google_appengine/"

# for tmux, see: https://github.com/tmux/tmux/issues/475
export EVENT_NOKQUEUE=1

[ -f ~/.fzf.bash ] && source ~/.fzf.bash
