#!/usr/bin/env bash

# Oneshot Splash Screen for Hyprland
# Shows visual splash while system loads

SPLASH_SCRIPT="$HOME/.config/splash/startup.py"
SPLASH_DURATION=8  # seconds

# Check if splash exists
if [ ! -f "$SPLASH_SCRIPT" ]; then
    # No splash available, exit silently
    exit 0
fi

# Check if GTK is available
if ! python3 -c "import gi" 2>/dev/null; then
    # GTK not available, skip splash
    exit 0
fi

# Launch splash in background
"$SPLASH_SCRIPT" &
SPLASH_PID=$!

# Wait for waybar to start (indicates system is ready)
timeout=15
count=0

while [ $count -lt $timeout ]; do
    if pgrep -x waybar > /dev/null 2>&1; then
        # Waybar is running, wait a bit more for everything to settle
        sleep 1
        break
    fi
    sleep 0.5
    count=$((count + 1))
done

# Also enforce minimum splash time
sleep "$SPLASH_DURATION"

# Close splash
if ps -p $SPLASH_PID > /dev/null 2>&1; then
    kill $SPLASH_PID 2>/dev/null
fi

# Alternative: use pkill if PID doesn't work
pkill -f splash-enhanced.py 2>/dev/null

exit 0
