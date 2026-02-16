#!/usr/bin/env python3

"""
Oneshot Boot Splash Screen - Enhanced Version
Supports custom background images and Niko character image
Works with any wlroots-based compositor (Hyprland, Sway, Niri)
"""

import sys
import os
from pathlib import Path

try:
    import gi
    gi.require_version('Gtk', '3.0')
    gi.require_version('GdkPixbuf', '2.0')
    from gi.repository import Gtk, GdkPixbuf, Gdk, GLib
except ImportError:
    print("Error: GTK3 not available. Install with: sudo pacman -S python-gobject gtk3")
    sys.exit(1)

# Configuration paths
CONFIG_DIR = Path.home() / '.config' / 'splash'
BACKGROUND_IMAGE = CONFIG_DIR / 'background.png'  # Your custom background
NIKO_IMAGE = CONFIG_DIR / 'niko.png'  # Niko character image
FALLBACK_BG = CONFIG_DIR / 'wallpaper.png'  # Fallback to your hyprland wallpaper

class SplashScreen(Gtk.Window):
    def __init__(self):
        super().__init__()
        
        # Window setup
        self.set_decorated(False)
        self.set_app_paintable(True)
        self.fullscreen()
        self.set_keep_above(True)
        
        # Enable transparency
        screen = Gdk.Screen.get_default()
        visual = screen.get_rgba_visual()
        if visual:
            self.set_visual(visual)
        
        # Main overlay for layering
        self.overlay = Gtk.Overlay()
        self.add(self.overlay)
        
        # Add background
        self.add_background()
        
        # Content container
        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=40)
        vbox.set_halign(Gtk.Align.CENTER)
        vbox.set_valign(Gtk.Align.CENTER)
        self.overlay.add_overlay(vbox)
        
        # Title
        title = Gtk.Label()
        title.set_markup(
            '<span foreground="#9564FD" size="30000" weight="bold">'
            'ONESHOT WORLD MACHINE'
            '</span>'
        )
        vbox.pack_start(title, False, False, 0)
        
        # Niko character image
        self.add_niko_character(vbox)
        
        # Subtitle/flavor text
        subtitle = Gtk.Label()
        subtitle.set_markup(
            '<span foreground="#FFFF33" size="large" style="italic">'
            '"You only have one shot, player."'
            '</span>'
        )
        vbox.pack_start(subtitle, False, False, 0)
        
        # Loading text
        self.loading_label = Gtk.Label()
        self.loading_label.set_markup(
            '<span foreground="#7B4FD9" size="x-large">'
            'Loading the world...'
            '</span>'
        )
        vbox.pack_start(self.loading_label, False, False, 0)
        
        # Progress bar
        self.progress = Gtk.ProgressBar()
        self.progress.set_size_request(500, 15)
        self.progress.set_fraction(0.0)
        vbox.pack_start(self.progress, False, False, 0)
        
        # Apply custom CSS
        self.apply_styles()
        
        self.show_all()
        
        # Start animations
        self.progress_value = 0.0
        self.loading_dots = 0
        GLib.timeout_add(40, self.update_progress)
        GLib.timeout_add(300, self.update_loading_text)
        
        # Auto-close after completion
        GLib.timeout_add(3500, self.close_splash)
    
    def add_background(self):
        """Add custom background image"""
        bg_drawing = Gtk.DrawingArea()
        
        # Try to load custom background
        bg_path = None
        if BACKGROUND_IMAGE.exists():
            bg_path = BACKGROUND_IMAGE
        elif FALLBACK_BG.exists():
            bg_path = FALLBACK_BG
        elif (Path.home() / '.config' / 'hypr' / 'wallpaper.png').exists():
            bg_path = Path.home() / '.config' / 'hypr' / 'wallpaper.png'
        
        if bg_path:
            try:
                # Load and scale background to screen size
                screen = Gdk.Screen.get_default()
                width = screen.get_width()
                height = screen.get_height()
                
                self.bg_pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(
                    str(bg_path), width, height, False
                )
                bg_drawing.connect('draw', self.draw_background_image)
            except Exception as e:
                print(f"Could not load background: {e}, using solid color")
                bg_drawing.connect('draw', self.draw_solid_background)
        else:
            print("No background image found, using solid color")
            bg_drawing.connect('draw', self.draw_solid_background)
        
        self.overlay.add(bg_drawing)
    
    def draw_background_image(self, widget, cr):
        """Draw background image with slight darkening overlay"""
        # Draw the image
        Gdk.cairo_set_source_pixbuf(cr, self.bg_pixbuf, 0, 0)
        cr.paint()
        
        # Add dark overlay for better text visibility
        cr.set_source_rgba(0, 0, 0, 0.5)
        cr.paint()
        
        return False
    
    def draw_solid_background(self, widget, cr):
        """Draw solid black background as fallback"""
        cr.set_source_rgb(0, 0, 0)
        cr.paint()
        return False
    
    def add_niko_character(self, vbox):
        """Add Niko character image"""
        if NIKO_IMAGE.exists():
            try:
                # Load Niko image at appropriate size
                pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(
                    str(NIKO_IMAGE), 400, 400, False
                )
                
                # Add subtle glow effect with a frame
                frame = Gtk.Frame()
                frame.set_shadow_type(Gtk.ShadowType.NONE)
                
                image = Gtk.Image.new_from_pixbuf(pixbuf)
                frame.add(image)
                
                vbox.pack_start(frame, False, False, 0)
                
            except Exception as e:
                print(f"Could not load Niko image: {e}")
                self.add_niko_ascii(vbox)
        else:
            print("No Niko image found at ~/.config/splash/niko.png")
            self.add_niko_ascii(vbox)
    
    def add_niko_ascii(self, vbox):
        """Fallback: Add ASCII art Niko"""
        ascii_art = """       ／l、
     （ﾟ､ ｡ ７
      l、 ~ヽ
      じしf_,)ノ"""
        
        label = Gtk.Label()
        label.set_markup(
            f'<span foreground="#FFFF33" font="monospace 16" weight="bold">'
            f'{ascii_art}'
            f'</span>'
        )
        
        # Add a background box for the ASCII art
        event_box = Gtk.EventBox()
        event_box.add(label)
        vbox.pack_start(event_box, False, False, 0)
    
    def apply_styles(self):
        """Apply custom CSS styling"""
        css = b"""
        window {
            background-color: transparent;
        }
        
        progressbar {
            min-height: 15px;
            background-color: rgba(26, 26, 26, 0.8);
            border: 3px solid #9564FD;
        }
        
        progressbar progress {
            background-color: #9564FD;
            background-image: linear-gradient(
                to right,
                #9564FD 0%,
                #7B4FD9 50%,
                #9564FD 100%
            );
            background-size: 200% 100%;
            animation: shimmer 2s infinite;
        }
        
        @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
        
        frame {
            border: 3px solid #9564FD;
            border-radius: 0px;
            background-color: rgba(0, 0, 0, 0.3);
            padding: 10px;
        }
        """
        
        provider = Gtk.CssProvider()
        provider.load_from_data(css)
        Gtk.StyleContext.add_provider_for_screen(
            Gdk.Screen.get_default(),
            provider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )
    
    def update_progress(self):
        """Animate progress bar"""
        self.progress_value += 0.015
        if self.progress_value >= 1.0:
            self.progress_value = 1.0
            self.loading_label.set_markup(
                '<span foreground="#FFFF33" size="x-large" weight="bold">'
                'Welcome back!'
                '</span>'
            )
            return False
        
        self.progress.set_fraction(self.progress_value)
        return True
    
    def update_loading_text(self):
        """Animate loading text dots"""
        if self.progress_value >= 1.0:
            return False
        
        self.loading_dots = (self.loading_dots + 1) % 4
        dots = '.' * self.loading_dots
        
        self.loading_label.set_markup(
            f'<span foreground="#7B4FD9" size="x-large">'
            f'Loading the world{dots}'
            f'</span>'
        )
        
        return True
    
    def close_splash(self):
        """Close the splash screen"""
        Gtk.main_quit()
        return False

def main():
    # Create config directory if it doesn't exist
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    
    # Check for required images
    if not NIKO_IMAGE.exists():
        print(f"Tip: Add a Niko image at {NIKO_IMAGE} for better visuals!")
    
    if not BACKGROUND_IMAGE.exists() and not FALLBACK_BG.exists():
        print(f"Tip: Add a background image at {BACKGROUND_IMAGE}")
    
    splash = SplashScreen()
    splash.connect('destroy', Gtk.main_quit)
    
    try:
        Gtk.main()
    except KeyboardInterrupt:
        pass

if __name__ == '__main__':
    main()
