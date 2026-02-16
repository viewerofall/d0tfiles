#!/usr/bin/env bash

# Wallpaper Switcher - Rofi with Preview
# Uses rofi with image preview (no flashbang!)

# Read config
CONFIG_FILE="$HOME/.config/wallpaper-switcher.conf"

if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
else
    notify-send "Wallpaper Switcher" "Run setup first"
    exit 1
fi

if [ -z "$WALLPAPER_DIR" ] || [ ! -d "$WALLPAPER_DIR" ]; then
    notify-send "Wallpaper Switcher" "Invalid directory"
    exit 1
fi

CURRENT_WALLPAPER="$HOME/.config/hypr/wallpaper.png"
CACHE_DIR="$HOME/.cache/wallpaper-switcher/thumbs"
ROFI_THEME="$HOME/.config/rofi/wallpaper-selector-grid.rasi"

# Check if rofi theme exists
if [ ! -f "$ROFI_THEME" ]; then
    notify-send "Wallpaper Switcher" "Rofi theme not found!\nCopy wallpaper-selector-grid.rasi to ~/.config/rofi/"
    exit 1
fi

mkdir -p "$CACHE_DIR"

# Get wallpapers
shopt -s nullglob
wallpapers=("$WALLPAPER_DIR"/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP})
shopt -u nullglob

if [ ${#wallpapers[@]} -eq 0 ]; then
    notify-send "Wallpaper Switcher" "No wallpapers found"
    exit 1
fi

# Generate thumbnails for preview
if command -v convert &> /dev/null; then
    for img in "${wallpapers[@]}"; do
        filename=$(basename "$img")
        thumb="$CACHE_DIR/${filename%.*}.png"
        
        if [ ! -f "$thumb" ] || [ "$img" -nt "$thumb" ]; then
            convert "$img" -resize 400x300^ -gravity center -extent 400x300 "$thumb" 2>/dev/null
        fi
    done
fi

# Build list for rofi with preview icons
build_list() {
    for img in "${wallpapers[@]}"; do
        filename=$(basename "$img")
        name="${filename%.*}"
        thumb="$CACHE_DIR/${name}.png"
        
        # Check if current wallpaper
        if [ -L "$CURRENT_WALLPAPER" ] && [ "$(readlink -f "$CURRENT_WALLPAPER")" = "$img" ]; then
            echo -en "${name}\x00icon\x1f${thumb}\x1finfo\x1fcurrent\n"
        else
            echo -en "${name}\x00icon\x1f${thumb}\n"
        fi
    done
}

# Show rofi with image icons
selected=$(build_list | rofi -dmenu -i \
    -p "󰸉  Select Wallpaper" \
    -theme "$ROFI_THEME" \
    -show-icons \
    2>/dev/null)

# Exit if nothing selected
[ -z "$selected" ] && exit 0

# Find and set wallpaper
for img in "${wallpapers[@]}"; do
    filename=$(basename "$img")
    name="${filename%.*}"
    
    if [ "$name" = "$selected" ]; then
        # Set wallpaper
        ln -sf "$img" "$CURRENT_WALLPAPER"
        
        # Apply
        if pgrep -x "swaybg" > /dev/null; then
            pkill swaybg
            sleep 0.1
            swaybg -i "$img" -m fill &
        elif pgrep -x "swww-daemon" > /dev/null; then
            swww img "$img" --transition-type fade --transition-duration 1
        elif pgrep -x "hyprpaper" > /dev/null; then
            hyprctl hyprpaper unload all
            hyprctl hyprpaper preload "$img"
            hyprctl hyprpaper wallpaper ",$img"
        else
            swaybg -i "$img" -m fill &
        fi
        
        notify-send "Wallpaper Changed" "$selected"
        exit 0
    fi
done
