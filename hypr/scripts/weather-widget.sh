#!/usr/bin/env bash

CACHE="$HOME/.cache/openmeteo.json"
LOC_CACHE="$HOME/.cache/location.json"
CACHE_TIME=600

# --- Get location once ---
if [ ! -f "$LOC_CACHE" ]; then
    curl -s https://ipapi.co/json/ > "$LOC_CACHE"
fi

LAT=$(jq -r '.latitude' "$LOC_CACHE")
LON=$(jq -r '.longitude' "$LOC_CACHE")
CITY=$(jq -r '.city' "$LOC_CACHE")

fetch_weather() {
    curl -s --connect-timeout 5 \
    "https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=fahrenheit&timezone=auto"
}

# --- Cache logic ---
if [ -f "$CACHE" ]; then
    AGE=$(( $(date +%s) - $(stat -c %Y "$CACHE") ))
else
    AGE=9999
fi

if [ "$AGE" -gt "$CACHE_TIME" ]; then
    fetch_weather > "$CACHE"
fi

DATA=$(cat "$CACHE")

TEMP=$(echo "$DATA" | jq -r '.current_weather.temperature')
WIND=$(echo "$DATA" | jq -r '.current_weather.windspeed')

# Weather code mapping
CODE=$(echo "$DATA" | jq -r '.current_weather.weathercode')

case "$CODE" in
    0) DESC="Clear ☀️" ;;
    1|2|3) DESC="Cloudy ☁️" ;;
    45|48) DESC="Fog 🌫️" ;;
    51|53|55|61|63|65) DESC="Rain 🌧️" ;;
    71|73|75) DESC="Snow ❄️" ;;
    95) DESC="Thunder ⛈️" ;;
    *) DESC="Unknown 🌡️" ;;
esac

FORECAST=""
for i in 0 1 2 3; do
    DATE=$(echo "$DATA" | jq -r ".daily.time[$i]")
    MAX=$(echo "$DATA" | jq -r ".daily.temperature_2m_max[$i]")
    MIN=$(echo "$DATA" | jq -r ".daily.temperature_2m_min[$i]")

    FORECAST="$FORECAST\n📅 $DATE\n   High ${MAX}°  Low ${MIN}°\n"
done

CHOICE=$(printf "🌤  %s  %.0f°\n🌬  Wind %.0f mph\n\n📅 Forecast\n🔄 Refresh\n❌ Close" \
    "$DESC" "$TEMP" "$WIND" \
    | rofi -dmenu -i -p "$CITY Weather")

case "$CHOICE" in

    *Forecast*)
        echo -e "$FORECAST\n\nPress Enter to return" \
        | rofi -dmenu -p "Forecast"
        exec "$0"
        ;;

    *Refresh*)
        rm -f "$CACHE"
        exec "$0"
        ;;

    *)
        exit 0
        ;;
esac
