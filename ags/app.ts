#!/usr/bin/env -S ags run

// Astal Config - Oneshot World Machine
// FINAL WORKING VERSION
import Gtk from 'gi://Gtk?version=3.0'
import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import * as Widget from "astal/gtk3/widget"
import Variable from "astal/variable"
import { bind } from "astal/binding"
import GLib from "gi://GLib"
import Hyprland from "gi://AstalHyprland"
import Wp from "gi://AstalWp"
import Battery from "gi://AstalBattery"
import Network from "gi://AstalNetwork"
import Tray from "gi://AstalTray"
import Mpris from "gi://AstalMpris"

// Colors
const colors = {
  bg: "#000000",
  bgAlt: "#0a0a0a",
  fg: "#9564FD",
  fgAlt: "#7B4FD9",
  accent: "#FFFF33",
  border: "#9564FD"
}

// Global control center visibility
const controlCenterVisible = Variable(false)

// Workspaces Widget
function Workspaces() {
  const hypr = Hyprland.get_default()

  return new Widget.Box({
    className: "workspaces",
    children: bind(hypr, "workspaces").as(wss =>
    wss
    .filter(ws => ws.id > 0)
    .sort((a, b) => a.id - b.id)
    .map(ws => new Widget.Button({
      className: bind(hypr, "focusedWorkspace").as(fw =>
      ws === fw ? "workspace focused" : "workspace"
      ),
      onClicked: () => ws.focus(),
                                 child: new Widget.Label({ label: `${ws.id}` })
    }))
    )
  })
}

// Client Title Widget
function ClientTitle() {
  const hypr = Hyprland.get_default()
  const focused = bind(hypr, "focusedClient")

  return new Widget.Box({
    className: "client-title",
    visible: focused.as(Boolean),
                        child: new Widget.Label({
                          label: focused.as(client =>
                          client ? client.title.substring(0, 50) : ""
                          )
                        })
  })
}

// Clock Widget
function Clock() {
  const time = Variable("").poll(1000, () =>
  GLib.DateTime.new_now_local().format("%I:%M %p")!
  )

  const date = Variable("").poll(1000, () =>
  GLib.DateTime.new_now_local().format("%a %b %d")!
  )

  return new Widget.Box({
    className: "clock",
    children: [
      new Widget.Label({
        className: "time",
        label: time()
      }),
      new Widget.Label({
        className: "date",
        label: date()
      }),
    ]
  })
}

// Media Player Widget with Dropdown Controls
function Media() {
  const mpris = Mpris.get_default()
  const expanded = Variable(false)

  return new Widget.Box({
    className: "media",
    vertical: true,
    children: bind(mpris, "players").as(players => {
      const player = players[0]

      if (!player) {
        return []
      }

      const { title, artist, artUrl } = player
      const displayText = artist ? `${title} - ${artist}` : title

      // Main button
      const mainButton = new Widget.Button({
        className: "media-button",
        onClicked: () => expanded.set(!expanded.get()),
                                           child: new Widget.Box({
                                             children: [
                                               new Widget.Icon({
                                                 icon: bind(player, "playbackStatus").as(status =>
                                                 status === Mpris.PlaybackStatus.PLAYING
                                                 ? "media-playback-pause-symbolic"
                                                 : "media-playback-start-symbolic"
                                                 )
                                               }),
                                               new Widget.Label({
                                                 label: displayText.substring(0, 40),
                                                                tooltipText: displayText
                                               })
                                             ]
                                           })
      })

      // Expanded controls
      const controls = new Widget.Box({
        className: "media-controls",
        visible: expanded(),
                                      children: [
                                        new Widget.Button({
                                          className: "media-control-btn",
                                          tooltipText: "Previous",
                                          onClicked: () => player.previous(),
                                                          child: new Widget.Icon({ icon: "media-skip-backward-symbolic" })
                                        }),
                                        new Widget.Button({
                                          className: "media-control-btn",
                                          tooltipText: "Play/Pause",
                                          onClicked: () => player.playPause(),
                                                          child: new Widget.Icon({
                                                            icon: bind(player, "playbackStatus").as(status =>
                                                            status === Mpris.PlaybackStatus.PLAYING
                                                            ? "media-playback-pause-symbolic"
                                                            : "media-playback-start-symbolic"
                                                            )
                                                          })
                                        }),
                                        new Widget.Button({
                                          className: "media-control-btn",
                                          tooltipText: "Next",
                                          onClicked: () => player.next(),
                                                          child: new Widget.Icon({ icon: "media-skip-forward-symbolic" })
                                        }),
                                        new Widget.Button({
                                          className: "media-control-btn",
                                          tooltipText: "Shuffle",
                                          onClicked: () => player.shuffle = !player.shuffle,
                                                          child: new Widget.Icon({ icon: "media-playlist-shuffle-symbolic" })
                                        }),
                                      ]
      })

      return [mainButton, controls]
    })
  })
}

// Weather Widget
function Weather() {
  const weatherData = Variable({ temp: "--", icon: "🌡", condition: "Loading..." })

  const updateWeather = () => {
    try {
      const configFile = `${GLib.get_home_dir()}/.config/weather-config`
      const [, contents] = GLib.file_get_contents(configFile)
      const city = new TextDecoder().decode(contents).trim() || "Phoenix"

      GLib.spawn_command_line_async(`bash -c "curl -s 'wttr.in/${city}?format=j1' -o ${GLib.get_home_dir()}/.cache/weather-cache.json"`)

      GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
        try {
          const cacheFile = `${GLib.get_home_dir()}/.cache/weather-cache.json`
          const [, cacheContents] = GLib.file_get_contents(cacheFile)
          const data = JSON.parse(new TextDecoder().decode(cacheContents))

          const temp = data.current_condition[0].temp_F
          const condition = data.current_condition[0].weatherDesc[0].value

          let icon = "🌡"
          if (condition.includes("Clear") || condition.includes("Sunny")) icon = "☀"
            else if (condition.includes("Partly cloudy")) icon = "⛅"
              else if (condition.includes("Cloudy")) icon = "☁"
                else if (condition.includes("Rain")) icon = "🌧"

                  weatherData.set({ temp, icon, condition })
        } catch (e) {
          print("Weather cache read error:", e)
        }
        return false
      })
    } catch (e) {
      print("Weather fetch error:", e)
    }
  }

  updateWeather()
  Variable("").poll(1800000, updateWeather)

  return new Widget.Button({
    className: "weather",
    onClicked: () => {
      GLib.spawn_command_line_async(`${GLib.get_home_dir()}/.config/hypr/scripts/weather-widget.sh`)
    },
    child: new Widget.Box({
      children: [
        new Widget.Label({
          label: weatherData().as(data => `${data.icon} ${data.temp}°F`)
        })
      ]
    })
  })
}

// Volume Widget
function Volume() {
  const speaker = Wp.get_default()?.audio.defaultSpeaker!

  return new Widget.Box({
    className: "volume",
    children: [
      new Widget.Icon({
        icon: bind(speaker, "volumeIcon")
      }),
      new Widget.Label({
        label: bind(speaker, "volume").as(v => `${Math.round(v * 100)}%`)
      })
    ]
  })
}

// Network Widget
function NetworkIndicator() {
  const { wifi, wired } = Network.get_default()

  return new Widget.Box({
    className: "network",
    children: [
      new Widget.Icon({
        icon: bind(wifi, "iconName"),
                      visible: bind(wifi, "enabled")
      }),
      new Widget.Icon({
        icon: bind(wired, "iconName"),
                      visible: bind(wired, "speed").as(s => s > 0)
      })
    ]
  })
}

// Battery Widget
function BatteryIndicator() {
  const bat = Battery.get_default()

  if (!bat.isPresent) {
    return new Widget.Box({})
  }

  return new Widget.Box({
    className: "battery",
    children: [
      new Widget.Icon({
        icon: bind(bat, "batteryIconName")
      }),
      new Widget.Label({
        label: bind(bat, "percentage").as(p => `${Math.round(p * 100)}%`)
      })
    ]
  })
}

// System Tray Widget
function SysTray() {
  const tray = Tray.get_default()

  return new Widget.Box({
    className: "system-tray",
    children: bind(tray, "items").as(items => items.map(item => {
      if (item.iconThemePath)
        Gtk.IconTheme.get_default()?.append_search_path(item.iconThemePath)

        return new Widget.Button({
          className: "tray-item",
          tooltipMarkup: bind(item, "tooltipMarkup"),
                                 onClickRelease: (self, event) => {
                                   if (event.button === Gdk.BUTTON_PRIMARY) {
                                     item.activate(event.x, event.y)
                                   } else if (event.button === Gdk.BUTTON_SECONDARY) {
                                     item.activate(event.x, event.y)
                                   }
                                 },
                                 child: new Widget.Icon({
                                   gIcon: bind(item, "gicon")
                                 })
        })
    }))
  })
}

// Niko Avatar Widget
function NikoAvatar() {
  const mood = Variable("😌").poll(60000, () => {
    const hour = GLib.DateTime.new_now_local().get_hour()

    if (hour >= 6 && hour < 12) return "😌"
      if (hour >= 12 && hour < 14) return "😊"
        if (hour >= 14 && hour < 18) return "😌"
          if (hour >= 18 && hour < 22) return "😊"
            return "😴"
  })

  return new Widget.Box({
    className: "niko-avatar",
    child: new Widget.Label({ label: mood() })
  })
}

// Notification Center Button
function NotificationButton() {
  return new Widget.Button({
    className: "notification-button",
    tooltipText: "Notifications",
    onClicked: () => {
      GLib.spawn_command_line_async("swaync-client -t")
    },
    child: new Widget.Icon({
      icon: "preferences-system-notifications-symbolic"
    })
  })
}

// App Launcher Button
function AppLauncher() {
  return new Widget.Button({
    className: "app-launcher",
    tooltipText: "Applications",
    onClicked: () => {
      GLib.spawn_command_line_async(`${GLib.get_home_dir()}/.config/rofi/bin/launcher/launcher.sh`)
    },
    child: new Widget.Icon({
      icon: "view-app-grid-symbolic"
    })
  })
}

// Wallpaper Switcher Button (keeping existing one)

// CPU Usage Widget
function CPU() {
  const usage = Variable(0).poll(2000, () => {
    try {
      const [, out] = GLib.spawn_command_line_sync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}'")
      const str = new TextDecoder().decode(out).trim()
      return parseFloat(str) || 0
    } catch {
      return 0
    }
  })

  return new Widget.Box({
    className: "cpu",
    tooltipText: usage().as(u => `CPU: ${Math.round(u)}%`),
                        children: [
                          new Widget.Icon({ icon: "cpu-symbolic" }),
                        new Widget.Label({ label: usage().as(u => `${Math.round(u)}%`) })
                        ]
  })
}

// RAM Usage Widget
function RAM() {
  const usage = Variable(0).poll(2000, () => {
    try {
      const [, out] = GLib.spawn_command_line_sync("free | grep Mem | awk '{print ($3/$2) * 100.0}'")
      const str = new TextDecoder().decode(out).trim()
      return parseFloat(str) || 0
    } catch {
      return 0
    }
  })

  return new Widget.Box({
    className: "ram",
    tooltipText: usage().as(u => `RAM: ${Math.round(u)}%`),
                        children: [
                          new Widget.Icon({ icon: "drive-harddisk-symbolic" }),
                        new Widget.Label({ label: usage().as(u => `${Math.round(u)}%`) })
                        ]
  })
}

// Temperature Widget
function Temperature() {
  const temp = Variable(0).poll(5000, () => {
    try {
      const [, out] = GLib.spawn_command_line_sync("cat /sys/class/thermal/thermal_zone0/temp")
      const str = new TextDecoder().decode(out).trim()
      return Math.round(parseInt(str) / 1000) || 0
    } catch {
      return 0
    }
  })

  return new Widget.Box({
    className: "temperature",
    tooltipText: temp().as(t => `CPU Temp: ${t}°C`),
                        children: [
                          new Widget.Icon({ icon: "weather-clear-symbolic" }),
                        new Widget.Label({ label: temp().as(t => `${t}°C`) })
                        ]
  })
}

// GPU Usage Widget (NVIDIA)
function GPU() {
  const usage = Variable(0).poll(2000, () => {
    try {
      const [, out] = GLib.spawn_command_line_sync("nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits")
      const str = new TextDecoder().decode(out).trim()
      return parseInt(str) || 0
    } catch {
      return 0
    }
  })

  return new Widget.Box({
    className: "gpu",
    visible: usage().as(u => u > 0), // Hide if no GPU detected
                        tooltipText: usage().as(u => `GPU: ${u}%`),
                        children: [
                          new Widget.Icon({ icon: "video-display-symbolic" }),
                        new Widget.Label({ label: usage().as(u => `${u}%`) })
                        ]
  })
}

// Power Menu Button
function PowerMenu() {
  return new Widget.Button({
    className: "power-menu",
    tooltipText: "Power Menu",
    onClicked: () => {
      GLib.spawn_command_line_async(`${GLib.get_home_dir()}/.config/rofi/bin/powermenu/powermenu.sh`)
    },
    child: new Widget.Icon({
      icon: "system-shutdown-symbolic"
    })
  })
}

// Idle Inhibitor Toggle
function IdleInhibitor() {
  const inhibited = Variable(false)

  return new Widget.Button({
    className: "idle-inhibitor",
    tooltipText: inhibited().as(i => i ? "Sleep: Disabled" : "Sleep: Enabled"),
                           onClicked: () => {
                             if (inhibited.get()) {
                               GLib.spawn_command_line_async("pkill -f 'systemd-inhibit --what=idle'")
                               inhibited.set(false)
                             } else {
                               GLib.spawn_command_line_async("systemd-inhibit --what=idle --who=AGS --why='User requested' sleep infinity")
                               inhibited.set(true)
                             }
                           },
                           child: new Widget.Icon({
                             icon: inhibited().as(i => i ? "weather-clear-symbolic" : "weather-clear-night-symbolic")
                           })
  })
}

// Control Center Popup Window
function ControlCenterPopup() {
  const wifi = Network.get_default().wifi
  const speaker = Wp.get_default()?.audio.defaultSpeaker!

  return new Widget.Window({
    name: "control-center",
    className: "control-center-window",
    visible: controlCenterVisible(),
                           anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT,
                           exclusivity: Astal.Exclusivity.NORMAL,
                           keymode: Astal.Keymode.ON_DEMAND,
                           child: new Widget.Box({
                             className: "control-center-content",
                             vertical: true,
                             children: [
                               // Header
                               new Widget.Box({
                                 className: "control-center-header",
                                 children: [
                                   new Widget.Label({
                                     label: "Quick Settings",
                                     className: "control-center-title"
                                   })
                                 ]
                               }),

                               // WiFi Section
                               new Widget.Box({
                                 className: "control-section",
                                 vertical: true,
                                 children: [
                                   new Widget.Button({
                                     className: "control-button",
                                     onClicked: () => {
                                       wifi.enabled = !wifi.enabled
                                     },
                                     child: new Widget.Box({
                                       children: [
                                         new Widget.Icon({
                                           icon: bind(wifi, "iconName")
                                         }),
                                         new Widget.Box({
                                           vertical: true,
                                           children: [
                                             new Widget.Label({
                                               label: "WiFi",
                                               className: "control-label",
                                               halign: Gtk.Align.START
                                             }),
                                             new Widget.Label({
                                               label: bind(wifi, "ssid").as(ssid => ssid || "Disconnected"),
                                                              className: "control-sublabel",
                                                              halign: Gtk.Align.START
                                             })
                                           ]
                                         })
                                       ]
                                     })
                                   })
                                 ]
                               }),

                               // Bluetooth Section
                               new Widget.Box({
                                 className: "control-section",
                                 children: [
                                   new Widget.Button({
                                     className: "control-button",
                                     onClicked: () => {
                                       GLib.spawn_command_line_async("bluetoothctl power toggle")
                                     },
                                     child: new Widget.Box({
                                       children: [
                                         new Widget.Icon({
                                           icon: "bluetooth-symbolic"
                                         }),
                                         new Widget.Label({
                                           label: "Bluetooth",
                                           className: "control-label"
                                         })
                                       ]
                                     })
                                   })
                                 ]
                               }),

                               // Volume Slider
                               new Widget.Box({
                                 className: "control-section",
                                 vertical: true,
                                 children: [
                                   new Widget.Label({
                                     label: "Volume",
                                     className: "slider-label",
                                     halign: Gtk.Align.START
                                   }),
                                   new Widget.Box({
                                     children: [
                                       new Widget.Icon({
                                         icon: bind(speaker, "volumeIcon")
                                       }),
                                       new Widget.Slider({
                                         className: "volume-slider",
                                         hexpand: true,
                                         value: bind(speaker, "volume"),
                                                         onDragged: ({ value }) => speaker.volume = value,
                                                         min: 0,
                                                         max: 1
                                       }),
                                       new Widget.Label({
                                         label: bind(speaker, "volume").as(v => `${Math.round(v * 100)}%`)
                                       })
                                     ]
                                   })
                                 ]
                               }),

                               // Brightness Slider
                               new Widget.Box({
                                 className: "control-section",
                                 vertical: true,
                                 children: [
                                   new Widget.Label({
                                     label: "Brightness",
                                     className: "slider-label",
                                     halign: Gtk.Align.START
                                   }),
                                   new Widget.Box({
                                     children: [
                                       new Widget.Icon({
                                         icon: "display-brightness-symbolic"
                                       }),
                                       new Widget.Slider({
                                         className: "brightness-slider",
                                         hexpand: true,
                                         value: 50,
                                         onDragged: ({ value }) => {
                                           GLib.spawn_command_line_async(`brightnessctl set ${Math.round(value)}%`)
                                         },
                                         min: 0,
                                         max: 100
                                       }),
                                       new Widget.Label({
                                         label: "50%"
                                       })
                                     ]
                                   })
                                 ]
                               })
                             ]
                           })
  })
}

// Control Center Toggle Button (opens popup with WiFi, Bluetooth, etc.)
// Control Center Toggle Button
function ControlCenter() {
  return new Widget.Button({
    className: "control-center-btn",
    tooltipText: "Control Center",
    onClicked: () => {
      controlCenterVisible.set(!controlCenterVisible.get())
    },
    child: new Widget.Box({
      children: [
        new Widget.Icon({ icon: "preferences-system-symbolic" })
      ]
    })
  })
}

// Wallpaper Switcher Button
function WallpaperSwitcher() {
  return new Widget.Button({
    className: "wallpaper-switcher",
    tooltipText: "Change Wallpaper",
    onClicked: () => {
      GLib.spawn_command_line_async(`${GLib.get_home_dir()}/.config/hypr/scripts/wallpaper.sh`)
    },
    child: new Widget.Icon({
      icon: "preferences-desktop-wallpaper-symbolic"
    })
  })
}

// Main Bar
function Bar(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

  return new Widget.Window({
    className: "Bar",
    gdkmonitor: gdkmonitor,
    exclusivity: Astal.Exclusivity.EXCLUSIVE,
    anchor: TOP | LEFT | RIGHT,
    child: new Widget.CenterBox({
      startWidget: new Widget.Box({
        className: "left",
        halign: Gtk.Align.START,
        children: [
          AppLauncher(),
                                  Workspaces(),
                                  ClientTitle()
        ]
      }),
      centerWidget: new Widget.Box({
        className: "center",
        children: [Clock()]
      }),
      endWidget: new Widget.Box({
        className: "right",
        halign: Gtk.Align.END,
        children: [
          WallpaperSwitcher(),
                                Weather(),
                                Media(),
                                CPU(),
                                RAM(),
                                Temperature(),
                                GPU(),
                                ControlCenter(),
                                NotificationButton(),
                                IdleInhibitor(),
                                NikoAvatar(),
                                PowerMenu()
        ]
      })
    })
  })
}

// Styling - Actually Good CSS
const css = `
* {
  all: unset;
  font-family: "Terminess Nerd Font", monospace;
  font-size: 13px;
}

window.Bar {
  background-color: rgba(0, 0, 0, 0.9);
  color: #9564FD;
}

box.Bar {
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.95), rgba(10, 10, 10, 0.9));
  border-bottom: 3px solid ${colors.border};
  padding: 6px 12px;
  box-shadow: 0 2px 10px rgba(149, 100, 253, 0.3);
}

/* Workspaces */
box.workspaces {
  background-color: rgba(10, 10, 10, 0.6);
  border-radius: 10px;
  padding: 4px;
  margin: 0 4px;
}

button.workspace {
  min-width: 35px;
  min-height: 35px;
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.8), rgba(30, 30, 30, 0.6));
  color: ${colors.fgAlt};
  border: 2px solid transparent;
  border-radius: 8px;
  padding: 6px 10px;
  margin: 0 3px;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 600;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
}

button.workspace:hover {
  background: linear-gradient(135deg, rgba(149, 100, 253, 0.3), rgba(123, 79, 217, 0.2));
  border-color: ${colors.fgAlt};
  box-shadow: 0 4px 8px rgba(149, 100, 253, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1);
}

button.workspace.focused {
  background: linear-gradient(135deg, ${colors.fg}, ${colors.fgAlt});
  color: #000000;
  border-color: ${colors.accent};
  font-weight: bold;
  box-shadow: 0 0 20px rgba(149, 100, 253, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.2);
}

/* Client Title */
box.client-title {
  padding: 6px 16px;
  background: linear-gradient(90deg, rgba(10, 10, 10, 0.8), rgba(20, 20, 20, 0.6));
  border-radius: 10px;
  border: 1px solid rgba(149, 100, 253, 0.2);
  margin: 0 4px;
}

box.client-title label {
  color: ${colors.fg};
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* Clock */
box.clock {
  padding: 6px 20px;
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.9), rgba(30, 30, 30, 0.8));
  border-radius: 12px;
  border: 2px solid ${colors.border};
  margin: 0 8px;
  box-shadow: 0 4px 12px rgba(149, 100, 253, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.05);
}

label.time {
  color: ${colors.accent};
  font-weight: bold;
  font-size: 15px;
  text-shadow: 0 0 10px rgba(255, 255, 51, 0.5);
  margin-right: 10px;
}

label.date {
  color: ${colors.fg};
  font-size: 13px;
  opacity: 0.9;
}

/* Media Player */
button.media-button {
  padding: 6px 16px;
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.8), rgba(30, 30, 30, 0.6));
  border: 2px solid transparent;
  border-radius: 10px;
  margin: 0 4px;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

button.media-button:hover {
  background: linear-gradient(135deg, rgba(149, 100, 253, 0.3), rgba(123, 79, 217, 0.2));
  border-color: ${colors.fgAlt};
  box-shadow: 0 4px 12px rgba(149, 100, 253, 0.4);
}

button.media-button icon {
  color: ${colors.accent};
  margin-right: 8px;
  text-shadow: 0 0 8px rgba(255, 255, 51, 0.6);
}

button.media-button label {
  color: ${colors.fg};
  font-weight: 500;
}

/* Weather */
button.weather {
  padding: 6px 16px;
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.8), rgba(30, 30, 30, 0.6));
  border: 2px solid transparent;
  border-radius: 10px;
  margin: 0 4px;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

button.weather:hover {
  background: linear-gradient(135deg, rgba(149, 100, 253, 0.3), rgba(123, 79, 217, 0.2));
  border-color: ${colors.fgAlt};
  box-shadow: 0 4px 12px rgba(149, 100, 253, 0.4);
}

button.weather label {
  color: ${colors.fg};
  font-weight: 600;
  font-size: 14px;
}

/* Volume, Network, Battery */
box.volume, box.network, box.battery {
  padding: 6px 14px;
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.8), rgba(30, 30, 30, 0.6));
  border-radius: 10px;
  border: 1px solid rgba(149, 100, 253, 0.2);
  margin: 0 3px;
}

box.volume icon, box.volume label,
box.network icon,
box.battery icon, box.battery label {
  color: ${colors.fg};
}

box.volume label,
box.battery label {
  margin-left: 6px;
  font-weight: 500;
}

/* System Tray */
box.system-tray {
  background-color: rgba(10, 10, 10, 0.6);
  border-radius: 10px;
  padding: 4px;
  margin: 0 4px;
}

button.tray-item {
  padding: 8px;
  background: rgba(20, 20, 20, 0.6);
  border: 2px solid transparent;
  border-radius: 8px;
  margin: 0 2px;
  transition: all 200ms ease;
}

button.tray-item:hover {
  background: rgba(149, 100, 253, 0.3);
  border-color: ${colors.fgAlt};
  box-shadow: 0 2px 8px rgba(149, 100, 253, 0.4);
}

button.tray-item icon {
  color: ${colors.fg};
}

/* Niko Avatar */
box.niko-avatar {
  padding: 6px 12px;
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.9), rgba(20, 20, 20, 0.8));
  border: 2px solid ${colors.accent};
  border-radius: 12px;
  margin: 0 4px;
  box-shadow: 0 0 15px rgba(255, 255, 51, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1);
}

box.niko-avatar label {
  font-size: 20px;
  text-shadow: 0 0 10px rgba(255, 255, 51, 0.6);
}

/* Notification Button */
button.notification-button {
  padding: 8px 12px;
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.8), rgba(30, 30, 30, 0.6));
  border: 2px solid transparent;
  border-radius: 10px;
  margin: 0 4px;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

button.notification-button:hover {
  background: linear-gradient(135deg, rgba(149, 100, 253, 0.3), rgba(123, 79, 217, 0.2));
  border-color: ${colors.fgAlt};
  box-shadow: 0 4px 12px rgba(149, 100, 253, 0.4);
}

button.notification-button icon {
  color: ${colors.fg};
  font-size: 16px;
}

/* App Launcher */
button.app-launcher {
  padding: 8px 12px;
  background: linear-gradient(135deg, ${colors.fg}, ${colors.fgAlt});
  border: 2px solid ${colors.accent};
  border-radius: 10px;
  margin: 0 4px;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 15px rgba(149, 100, 253, 0.5);
}

button.app-launcher:hover {
  background: linear-gradient(135deg, ${colors.fgAlt}, ${colors.fg});
  box-shadow: 0 0 25px rgba(149, 100, 253, 0.8);
}

button.app-launcher icon {
  color: #000000;
  font-size: 18px;
  font-weight: bold;
}

/* Wallpaper Switcher */
button.wallpaper-switcher {
  padding: 8px 12px;
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.8), rgba(30, 30, 30, 0.6));
  border: 2px solid transparent;
  border-radius: 10px;
  margin: 0 4px;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

button.wallpaper-switcher:hover {
  background: linear-gradient(135deg, rgba(149, 100, 253, 0.3), rgba(123, 79, 217, 0.2));
  border-color: ${colors.fgAlt};
  box-shadow: 0 4px 12px rgba(149, 100, 253, 0.4);
}

button.wallpaper-switcher icon {
  color: ${colors.fg};
  font-size: 16px;
}

/* System Monitor Widgets */
box.cpu, box.ram, box.temperature, box.gpu {
  padding: 6px 12px;
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.8), rgba(30, 30, 30, 0.6));
  border-radius: 10px;
  border: 1px solid rgba(149, 100, 253, 0.2);
  margin: 0 3px;
}

box.cpu icon, box.cpu label {
  color: ${colors.accent};
}

box.ram icon, box.ram label {
  color: #00FFFF;
}

box.temperature icon, box.temperature label {
  color: #FF6B9D;
}

box.gpu icon, box.gpu label {
  color: #00FF00;
}

box.cpu label, box.ram label, box.temperature label, box.gpu label {
  margin-left: 6px;
  font-weight: 600;
  font-size: 12px;
}

/* Power Menu */
button.power-menu {
  padding: 8px 12px;
  background: linear-gradient(135deg, #FF6B9D, #FF4C7D);
  border: 2px solid #FF0066;
  border-radius: 10px;
  margin: 0 4px;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 15px rgba(255, 107, 157, 0.5);
}

button.power-menu:hover {
  background: linear-gradient(135deg, #FF4C7D, #FF6B9D);
  box-shadow: 0 0 25px rgba(255, 107, 157, 0.8);
}

button.power-menu icon {
  color: #000000;
  font-size: 16px;
}

/* Idle Inhibitor */
button.idle-inhibitor {
  padding: 8px 12px;
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.8), rgba(30, 30, 30, 0.6));
  border: 2px solid transparent;
  border-radius: 10px;
  margin: 0 4px;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

button.idle-inhibitor:hover {
  background: linear-gradient(135deg, rgba(149, 100, 253, 0.3), rgba(123, 79, 217, 0.2));
  border-color: ${colors.fgAlt};
  box-shadow: 0 4px 12px rgba(149, 100, 253, 0.4);
}

button.idle-inhibitor icon {
  color: ${colors.accent};
  font-size: 16px;
}

/* Control Center Button */
button.control-center-btn {
  padding: 8px 12px;
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.8), rgba(30, 30, 30, 0.6));
  border: 2px solid rgba(149, 100, 253, 0.3);
  border-radius: 10px;
  margin: 0 4px;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

button.control-center-btn:hover {
  background: linear-gradient(135deg, rgba(149, 100, 253, 0.4), rgba(123, 79, 217, 0.3));
  border-color: ${colors.fg};
  box-shadow: 0 4px 15px rgba(149, 100, 253, 0.5);
}

button.control-center-btn icon {
  color: ${colors.fg};
  font-size: 16px;
}

/* Media Controls Dropdown */
box.media {
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.9), rgba(30, 30, 30, 0.8));
  border-radius: 10px;
  padding: 4px;
  margin: 0 4px;
}

box.media-controls {
  padding: 8px;
  background: rgba(10, 10, 10, 0.6);
  border-radius: 8px;
  margin-top: 4px;
}

button.media-control-btn {
  padding: 8px;
  background: rgba(20, 20, 20, 0.8);
  border: 2px solid transparent;
  border-radius: 8px;
  margin: 0 2px;
  transition: all 200ms ease;
}

button.media-control-btn:hover {
  background: rgba(149, 100, 253, 0.3);
  border-color: ${colors.fgAlt};
  box-shadow: 0 2px 8px rgba(149, 100, 253, 0.4);
}

button.media-control-btn icon {
  color: ${colors.accent};
}

/* Tooltips */
tooltip {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(10, 10, 10, 0.95));
  color: ${colors.fg};
  border: 2px solid ${colors.border};
  border-radius: 8px;
  padding: 10px 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8), 0 0 40px rgba(149, 100, 253, 0.3);
  font-weight: 500;
}

/* Spacing between sections */
box.left, box.center, box.right {
  margin: 0 4px;
}

/* Control Center Popup Window */
window.control-center-window {
  background-color: transparent;
}

box.control-center-content {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(10, 10, 10, 0.95));
  border: 2px solid ${colors.border};
  border-radius: 16px;
  padding: 20px;
  margin: 10px;
  min-width: 350px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.9), 0 0 60px rgba(149, 100, 253, 0.4);
}

box.control-center-header {
  padding-bottom: 16px;
  border-bottom: 2px solid rgba(149, 100, 253, 0.3);
  margin-bottom: 16px;
}

label.control-center-title {
  color: ${colors.fg};
  font-size: 18px;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(149, 100, 253, 0.5);
}

box.control-section {
  margin: 8px 0;
  padding: 12px;
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.8), rgba(30, 30, 30, 0.6));
  border-radius: 12px;
  border: 1px solid rgba(149, 100, 253, 0.2);
}

button.control-button {
  padding: 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  transition: all 200ms ease;
}

button.control-button:hover {
  background: rgba(149, 100, 253, 0.2);
  box-shadow: 0 2px 8px rgba(149, 100, 253, 0.3);
}

button.control-button box {
  margin: 0 6px;
}

button.control-button icon {
  color: ${colors.fg};
  font-size: 24px;
}

label.control-label {
  color: ${colors.fg};
  font-size: 15px;
  font-weight: 600;
}

label.control-sublabel {
  color: ${colors.fgAlt};
  font-size: 12px;
  opacity: 0.8;
}

label.slider-label {
  color: ${colors.fg};
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

slider.volume-slider, slider.brightness-slider {
  min-height: 8px;
  min-width: 200px;
  background-color: rgba(149, 100, 253, 0.2);
  border-radius: 4px;
}

slider.volume-slider:hover, slider.brightness-slider:hover {
  background-color: rgba(149, 100, 253, 0.3);
}

slider.volume-slider slider, slider.brightness-slider slider {
  background: linear-gradient(90deg, ${colors.fg}, ${colors.fgAlt});
  border-radius: 4px;
  min-width: 16px;
  min-height: 16px;
  box-shadow: 0 2px 8px rgba(149, 100, 253, 0.5);
}

box.control-section box {
  margin: 0 4px;
}

box.control-section icon {
  color: ${colors.fg};
  font-size: 18px;
}

box.control-section label {
  color: ${colors.fg};
  font-size: 13px;
  font-weight: 500;
}
`

App.start({
  css: css,
  main() {
    App.get_monitors().map(Bar)
    ControlCenterPopup()
  },
})
