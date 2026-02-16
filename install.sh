#!/bin/bash
# Oneshot World Machine - Complete Setup Script
# Purple-themed Hyprland rice with AGS bar

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "═══════════════════════════════════════════"
echo "  Oneshot World Machine - Installation"
echo "═══════════════════════════════════════════"
echo ""

# Check if running Arch-based system
if ! command -v pacman &> /dev/null; then
    echo "❌ This script requires an Arch-based system with pacman"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
sudo pacman -S --needed --noconfirm \
    hyprland \
    waybar \
    rofi \
    swaync \
    playerctl \
    curl \
    jq \
    brightnessctl \
    bluez \
    bluez-utils \
    networkmanager \
    thunar

# Install AUR packages
echo "📦 Installing AUR packages..."
if command -v yay &> /dev/null; then
    yay -S --needed --noconfirm \
        libastal-git \
        libastal-gjs-git \
        libastal-meta \
        swww
elif command -v paru &> /dev/null; then
    paru -S --needed --noconfirm \
        libastal-git \
        libastal-gjs-git \
        libastal-meta \
        swww
else
    echo "❌ AUR helper (yay/paru) not found. Please install manually:"
    echo "   - libastal-git"
    echo "   - libastal-gjs-git"
    echo "   - libastal-meta"
    echo "   - swww"
    exit 1
fi

# Backup existing configs
echo "💾 Backing up existing configs..."
timestamp=$(date +%Y%m%d_%H%M%S)
[ -d ~/.config/hypr ] && mv ~/.config/hypr ~/.config/hypr.backup.$timestamp
[ -d ~/.config/ags ] && mv ~/.config/ags ~/.config/ags.backup.$timestamp
[ -d ~/.config/rofi ] && mv ~/.config/rofi ~/.config/rofi.backup.$timestamp
[ -d ~/.config/swaync ] && mv ~/.config/swaync ~/.config/swaync.backup.$timestamp

# Copy config files
echo "📁 Installing configuration files..."
mkdir -p ~/.config/{hypr,ags,rofi,swaync,fastfetch}

# Copy Hyprland config
cp -r "$SCRIPT_DIR/hypr/"* ~/.config/hypr/
chmod +x ~/.config/hypr/scripts/*.sh

# Copy AGS config
cp "$SCRIPT_DIR/ags/app.ts" ~/.config/ags/
cp "$SCRIPT_DIR/ags/tsconfig.json" ~/.config/ags/
chmod +x ~/.config/ags/app.ts

# Copy Rofi configs
cp -r "$SCRIPT_DIR/rofi/"* ~/.config/rofi/
chmod +x ~/.config/rofi/bin/powermenu/powermenu.sh

# Copy swaync config
cp -r "$SCRIPT_DIR/swaync/"* ~/.config/swaync/

cp -r "$SCRIPT_DIR/splash/"* ~/.config/splash
chmod +x ~/.config/splash/launch-hyprland.sh ~/.config/splash/startup.py

cp -r "$SCRIPT_DIR/fastfetch/"* ~/.config/fastfetch

# Create wallpapers directory
mkdir -p ~/Pictures/Wallpapers
if [ -d "$SCRIPT_DIR/wallpapers" ]; then
    cp "$SCRIPT_DIR/wallpapers/"* ~/Pictures/Wallpapers/ 2>/dev/null || true
fi

# Create weather config
echo "Phoenix" > ~/.config/weather-config

# Set up services
echo "🔧 Enabling services..."
sudo systemctl enable bluetooth
sudo systemctl start bluetooth
sudo systemctl enable NetworkManager
sudo systemctl start NetworkManager

echo ""
echo "✅ Installation complete!"
echo ""
echo "═══════════════════════════════════════════"
echo "  Next Steps:"
echo "═══════════════════════════════════════════"
echo ""
echo "1. Log out and select Hyprland from your display manager"
echo "2. On first login, AGS bar will start automatically"
echo "3. Configure your city for weather:"
echo "   echo 'YourCity' > ~/.config/weather-config"
echo ""
echo "═══════════════════════════════════════════"
echo "  Keybinds:"
echo "═══════════════════════════════════════════"
echo ""
echo "Super + Enter       - Terminal (kitty)"
echo "Super + Q           - Close window"
echo "Super + M           - Media controls"
echo "Super + W           - Weather widget"
echo "Super + Space       - App launcher"
echo "Super + P           - Power menu"
echo "Super + V           - Wallpaper selector"
echo "Super + N           - Notifications"
echo ""
echo "Click Control Center button for quick settings!"
echo ""
