#!/usr/bin/env bash

# Media Player Control - Rofi Menu
# Controls any MPRIS-compatible player (Spotify, Firefox, etc.)

# Check if playerctl is installed
if ! command -v playerctl &> /dev/null; then
    notify-send "Media Control" "playerctl not installed\nInstall: sudo pacman -S playerctl"
    exit 1
fi

# Get current player status
get_status() {
    playerctl status 2>/dev/null || echo "No player"
}

get_player_name() {
    playerctl metadata --format "{{ playerName }}" 2>/dev/null || echo "None"
}

get_title() {
    playerctl metadata --format "{{ title }}" 2>/dev/null || echo "No media"
}

get_artist() {
    playerctl metadata --format "{{ artist }}" 2>/dev/null || echo "Unknown"
}

get_album() {
    playerctl metadata --format "{{ album }}" 2>/dev/null || echo ""
}

# Get current info
STATUS=$(get_status)
PLAYER=$(get_player_name)
TITLE=$(get_title)
ARTIST=$(get_artist)
ALBUM=$(get_album)

# Build menu options
if [ "$STATUS" = "Playing" ]; then
    PLAY_PAUSE="  Pause"
else
    PLAY_PAUSE="  Play"
fi

MENU="$PLAY_PAUSE
  Previous
  Next
  Stop
󰝚  Shuffle
  Repeat
  Volume Up
  Volume Down
  Open Player"

# Show current playing info as header
if [ "$STATUS" != "No player" ]; then
    HEADER="Now Playing: $TITLE - $ARTIST"
else
    HEADER="No media playing"
fi

# Show rofi menu
chosen=$(echo "$MENU" | rofi -dmenu -i \
    -p "Media Control" \
    -theme ~/.config/rofi/media-player.rasi \
    -mesg "$HEADER" \
    2>/dev/null)

# Execute chosen action
case "$chosen" in
    *"Play")
        playerctl play
        notify-send -t 2000 "▶ Playing" "$TITLE"
        ;;
    *"Pause")
        playerctl pause
        notify-send -t 2000 " Paused" "$TITLE"
        ;;
    *"Previous")
        playerctl previous
        sleep 0.3
        NEW_TITLE=$(get_title)
        notify-send -t 2000 " Previous" "$NEW_TITLE"
        ;;
    *"Next")
        playerctl next
        sleep 0.3
        NEW_TITLE=$(get_title)
        notify-send -t 2000 " Next" "$NEW_TITLE"
        ;;
    *"Stop")
        playerctl stop
        notify-send -t 2000 " Stopped"
        ;;
    *"Shuffle")
        playerctl shuffle toggle
        notify-send -t 2000 "󰝚 Shuffle toggled"
        ;;
    *"Repeat")
        playerctl loop toggle
        notify-send -t 2000 " Repeat toggled"
        ;;
    *"Volume Up")
        playerctl volume 0.1+
        notify-send -t 2000 " Volume Up"
        ;;
    *"Volume Down")
        playerctl volume 0.1-
        notify-send -t 2000 " Volume Down"
        ;;
    *"Open Player")
        # Try to open the player app
        case "$PLAYER" in
            *"spotify"*)
                spotify &
                ;;
            *"firefox"*)
                firefox &
                ;;
            *)
                notify-send "Media Control" "Can't open $PLAYER"
                ;;
        esac
        ;;
esac
