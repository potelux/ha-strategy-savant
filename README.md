# Savant Dashboard Strategy

A Home Assistant dashboard strategy that auto-generates a Savant-inspired UI from your areas. No manual card configuration needed — assign devices to areas, and the strategy builds the dashboard.

Pairs with the [Savant theme](https://github.com/YOUR_USERNAME/savant-ha-theme) for the full look.

---

## What it generates

**Home view** — greeting, scene pills, and a live area grid showing active lights, media state, and temperature per room.

**One view per area** — entities grouped by domain (Lighting → Climate → Media → Security → Switches …), each section separated by a labelled rule. Cards are chosen per domain:

| Domain | Card used |
|---|---|
| `light` | Tile + brightness feature |
| `climate` | Thermostat |
| `media_player` | Media control |
| `cover` | Tile + open/close feature |
| `lock`, `switch`, `binary_sensor`, … | Tile grid |

---

## Installation

### Via HACS

1. HACS → Frontend → ⋮ → **Custom repositories**
2. Paste this repo URL, category **Dashboard**
3. Find **Savant Strategy** and click **Download**
4. Restart Home Assistant

### Manual

Copy `dist/savant-strategy.js` to `config/www/savant-strategy.js`.

### Register the resource

**Settings → Dashboards → Resources → Add**

| Field | Value |
|---|---|
| URL | `/hacsfiles/savant-ha-strategy/savant-strategy.js` (HACS) or `/local/savant-strategy.js` (manual) |
| Resource type | JavaScript module |

---

## Create the dashboard

1. **Settings → Dashboards → Add dashboard**
2. Choose **Savant** from the Community Dashboards section *(HA 2026.5+)*
   — or — set strategy manually (see below)

### Manual strategy YAML

```yaml
strategy:
  type: custom:savant-dashboard-strategy
```

### Full config options

```yaml
strategy:
  type: custom:savant-dashboard-strategy

  # Scene pill labels shown on the home view
  scenes:
    - Morning
    - Day
    - Evening
    - Away
    - Sleep
    - Cinema

  # Map scene pill labels to scene entity IDs (optional)
  # Tapping a pill calls scene.turn_on for the mapped entity
  scene_entities:
    Morning: scene.morning
    Evening: scene.evening
    Away:    scene.away
    Sleep:   scene.sleep

  # Entities to show in the environment strip on the home view
  indoor_temp_entity:  climate.living_room
  outdoor_temp_entity: sensor.outdoor_temperature
```

---

## Prerequisites

- Areas set up in **Settings → Areas**
- Devices or entities assigned to those areas
- Savant theme installed and active (optional but recommended)

---

## Theme

Install the companion [Savant theme](https://github.com/YOUR_USERNAME/savant-ha-theme) for the full visual experience. The strategy uses standard HA CSS custom properties (`--primary-color`, `--card-background-color`, `--ha-card-border-radius`, etc.) so it works with any dark theme, but it's designed specifically around the Savant palette.

---

## License

MIT
