# If we are not a login shell, source /etc/profile anyway
if [ "$0" != "-bash" ] ; then
  . /etc/profile
fi

# Env vars for all bash shells (login, interactive, scripts)
[ -f "$HOME/.coreenv" ] && . "$HOME/.coreenv"

if [ -f ~/.git-completion.sh ]; then
  . ~/.git-completion.sh
fi

if [ -f ~/.git-prompt.sh ]; then
  . ~/.git-prompt.sh
fi

# bash history settings
export HISTIGNORE="&:ls:[bf]g:exit"
export HISTCONTROL=erasedups
shopt -s histappend
PROMPT_COMMAND='history -a'

# Interactive aliases and functions
. ~/.corerc

# Add G-Cloud to path
if [ -f $GCLOUD_PATH/path.bash.inc ]; then
  source $GCLOUD_PATH/path.bash.inc  # 20ms
fi

if [ -f $GCLOUD_PATH//completion.bash.inc ]; then
  source $GCLOUD_PATH//completion.bash.inc  # 15 ms
fi

if [[ "$OSTYPE" == "linux-gnu" ]]; then  # Ubuntu
  if [ -f /etc/bash_completion ]; then
    . /etc/bash_completion
  fi
elif [[ "$OSTYPE" == "darwin"* ]]; then  # OSX
  export PS1="MBP3 \t ${GREEN}\W${RESET}$ "
  export PS2='> '
fi

[ -f ~/.fzf.bash ] && source ~/.fzf.bash

if command -v wtp &>/dev/null; then
  eval "$(wtp completion bash)"
fi

if command -v wt &>/dev/null; then
  eval "$(wt config shell init bash)"
fi