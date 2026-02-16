#!/usr/bin/env bash

# Oneshot World Machine Launcher
# Multi-mode launcher (Apps/Terminal/Windows)
# Switch modes with Ctrl+Tab

THEME="$HOME/.config/rofi/launcher.rasi"

# Launch rofi with all three modes enabled
# drun = Desktop applications (with icons)
# run = Terminal commands
# window = Open windows
rofi \
    -show drun \
    -modes "drun,run,window" \
    -show-icons \
    -drun-display-format "{name}" \
    -window-format "{w} · {c} · {t}" \
    -theme "$THEME" \
    -kb-mode-next "Control+Tab" \
    -kb-mode-previous "Control+Shift+Tab" \
    -kb-row-down "Down,Control+j" \
    -kb-row-up "Up,Control+k" \
    -kb-accept-entry "Return,KP_Enter" \
    -kb-remove-to-eol "" \
    -kb-mode-complete "" \
    -drun-match-fields name,generic,exec,categories,keywords \
    -window-match-fields title,class,desktop \
    -sort \
    -sorting-method fzf \
    -scroll-method 0 \
    -no-lazy-grab \
    -no-plugins
