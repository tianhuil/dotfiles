# Sourced before every Pi bash-tool command (settings.json `shellCommandPrefix`).
# Fails a command whose final pipeline hid an earlier stage's failure, and names the stage.
# Exit 141 is SIGPIPE from a reader such as `| head` closing early, not a failure.
__pi_pipecheck() {
    local rc=$1
    shift
    { [ "$#" -gt 1 ] && [ "$rc" -eq 0 ]; } || return 0
    local i=0 s
    for s in "$@"; do
        i=$((i + 1))
        if [ "$s" -ne 0 ] && [ "$s" -ne 141 ]; then
            echo "[pipe] stage $i of $# exited $s (stage codes: $*)" >&2
            exit "$s"
        fi
    done
}
trap '__pi_pipecheck "$?" "${PIPESTATUS[@]}"' EXIT
