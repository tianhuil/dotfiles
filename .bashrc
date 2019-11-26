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

. .corerc

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
  export PATH=$BREW_PREFIX/bin:$BREW_PREFIX/sbin:$PATH  # brew packages should have higher priority

  if [ -f $BREW_PREFIX/etc/bash_completion ]; then
    source $BREW_PREFIX/etc/bash_completion  # 400 ms
  fi

  # hack fix for subl
  # http://stackoverflow.com/questions/25718021/sublime-text-no-longer-launches-from-terminal
  alias subl='reattach-to-user-namespace /usr/local/bin/subl'
  alias code='reattach-to-user-namespace /usr/local/bin/code'
fi

if [ -x "$(command -v go)" ]; then
  export GOPATH=$(go env GOPATH)  # 80 ms
  export PATH=$PATH:$GOPATH/bin  # go packages should have lower priority
fi

# Add Anaconda to path
if [ -d "$HOME/anaconda2/bin" ]; then
  export PATH=$PATH:$HOME/anaconda2/bin  # anaconda packages should have lower priority
fi

# GAEPATH
if [ -L "$(command -v gcloud)" ]; then
  FULL_PATH=$(readlink $(command -v gcloud))
else
  FULL_PATH=$(command -v gcloud)
fi
export GCLOUD_PATH="$(dirname "$FULL_PATH")/../"
export GAEPATH="$GCLOUD_PATH/platform/google_appengine/"

# tabtab source for serverless package
# uninstall by removing these lines or running `tabtab uninstall serverless`
[ -f $NPM_PACKAGES/lib/node_modules/serverless/node_modules/tabtab/.completions/serverless.bash ] && . $NPM_PACKAGES/lib/node_modules/serverless/node_modules/tabtab/.completions/serverless.bash  # 15 ms
# tabtab source for sls package
# uninstall by removing these lines or running `tabtab uninstall sls`
[ -f $NPM_PACKAGES/lib/node_modules/serverless/node_modules/tabtab/.completions/sls.bash ] && . $NPM_PACKAGES/lib/node_modules/serverless/node_modules/tabtab/.completions/sls.bash  # 17 ms

# for tmux, see: https://github.com/tmux/tmux/issues/475
export EVENT_NOKQUEUE=1
