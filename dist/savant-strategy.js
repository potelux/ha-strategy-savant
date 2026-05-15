/**
 * Savant Dashboard Strategy for Home Assistant
 * Mirrors the Savant luxury home-automation UI aesthetic.
 *
 * Install: Add dist/savant-strategy.js as a Lovelace resource (type: module)
 * Usage:   New dashboard → Community dashboards → Savant
 *          — or — set dashboard YAML strategy: { type: custom:savant }
 *
 * Pairs with the Savant theme for best results.
 * https://github.com/YOUR_USERNAME/savant-ha-strategy
 */

// ─── Domain config ────────────────────────────────────────────────────────────

const DOMAIN_LABELS = {
  light:         'Lighting',
  climate:       'Climate',
  media_player:  'Media',
  cover:         'Covers',
  lock:          'Security',
  switch:        'Switches',
  fan:           'Fans',
  // binary_sensor + sensor are merged into one "Sensors" section (see below)
  camera:        'Cameras',
  input_boolean: 'Switches',
  input_number:  'Controls',
  scene:         'Scenes',
};

const DOMAIN_ORDER = [
  'light', 'climate', 'media_player', 'cover',
  'lock', 'switch', 'fan', 'camera',
  'input_boolean', 'input_number', 'scene',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDomain = entityId => entityId.split('.')[0];

const groupByDomain = entities => {
  const groups = {};
  for (const e of entities) {
    const d = getDomain(e.entity_id);
    (groups[d] ??= []).push(e);
  }
  return groups;
};

/**
 * All entity registry entries that belong to an area —
 * either directly assigned or inherited via a device assigned to that area.
 */
const getAreaEntities = (areaId, entityReg, deviceReg) => {
  const areaDeviceIds = new Set(
    deviceReg.filter(d => d.area_id === areaId).map(d => d.id)
  );
  return entityReg.filter(e =>
    !e.disabled_by &&
    !e.hidden_by &&
    (
      e.area_id === areaId ||
      (!e.area_id && e.device_id && areaDeviceIds.has(e.device_id))
    )
  );
};

// ─── SavantHomeCard ───────────────────────────────────────────────────────────

const HOME_CSS = `
  :host {
    display: block;
    font-family: var(--ha-font-family, 'DM Sans', sans-serif);
    padding: 20px 16px 32px;
    background: var(--primary-background-color);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .sv-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 22px; gap: 12px;
  }
  .sv-greeting {
    font-size: 20px; font-weight: 300;
    color: var(--primary-text-color); letter-spacing: -0.01em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sv-greeting em { color: var(--primary-color); font-style: normal; font-weight: 400; }
  .sv-time-pill {
    background: var(--secondary-background-color, #131316);
    border: 1px solid var(--ha-card-border-color, rgba(255,255,255,0.05));
    border-radius: 100px; padding: 5px 13px;
    font-size: 11px; font-weight: 300;
    color: var(--secondary-text-color); letter-spacing: 0.04em;
    white-space: nowrap; flex-shrink: 0;
  }

  .sv-scenes { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
  .sv-scene-pill {
    background: var(--table-row-alternative-background-color, #1D1D22);
    border: 1px solid var(--ha-card-border-color, rgba(255,255,255,0.05));
    border-radius: 100px; padding: 6px 15px;
    font-size: 12px; font-weight: 300; color: var(--secondary-text-color);
    cursor: pointer; white-space: nowrap; user-select: none;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .sv-scene-pill:hover, .sv-scene-pill.active {
    background: var(--ha-chip-background-color, rgba(201,169,110,0.1));
    border-color: rgba(201,169,110,0.2);
    color: var(--primary-color);
  }

  .sv-label {
    font-size: 10px; font-weight: 300; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--secondary-text-color);
    margin-bottom: 12px; opacity: 0.65;
  }

  .sv-area-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 10px; margin-bottom: 20px;
  }
  @media (max-width: 500px) {
    .sv-area-grid { grid-template-columns: 1fr 1fr; }
  }
  .sv-area-tile {
    background: var(--card-background-color);
    border: 1px solid var(--ha-card-border-color, rgba(255,255,255,0.05));
    border-radius: var(--ha-card-border-radius, 16px);
    padding: 15px 13px 13px; min-height: 100px;
    display: flex; flex-direction: column; justify-content: space-between;
    cursor: pointer; text-decoration: none;
    transition: border-color 0.15s;
    position: relative; overflow: hidden;
  }
  .sv-area-tile:hover { border-color: rgba(255,255,255,0.12); }
  .sv-area-tile.active::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0;
    height: 2px; background: var(--primary-color); opacity: 0.65;
  }
  .sv-area-name {
    font-size: 13px; font-weight: 300; color: var(--primary-text-color);
    letter-spacing: 0.01em; line-height: 1.3; margin-bottom: 10px;
  }
  .sv-area-meta { display: flex; flex-direction: column; gap: 5px; }
  .sv-area-stat {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 300; color: var(--secondary-text-color); line-height: 1;
  }
  .sv-area-stat.lit   { color: var(--primary-color); }
  .sv-area-stat.media { color: var(--info-color, #6EB6C9); }
  .sv-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--state-off-color, #3E3E48); flex-shrink: 0;
  }
  .sv-dot.lit   { background: var(--primary-color); box-shadow: 0 0 4px rgba(201,169,110,0.5); }
  .sv-dot.media { background: var(--info-color, #6EB6C9); box-shadow: 0 0 4px rgba(110,182,201,0.5); }
  .sv-area-temp {
    font-size: 22px; font-weight: 200; color: var(--primary-text-color);
    letter-spacing: -0.03em; line-height: 1; margin-top: 2px;
  }
  .sv-area-temp sup { font-size: 11px; font-weight: 300; vertical-align: super; }

  .sv-strip { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .sv-strip-card {
    background: var(--card-background-color);
    border: 1px solid var(--ha-card-border-color, rgba(255,255,255,0.05));
    border-radius: var(--ha-card-border-radius, 16px);
    padding: 14px 14px 12px; display: flex; align-items: center; gap: 12px;
  }
  .sv-strip-icon { font-size: 20px; flex-shrink: 0; }
  .sv-strip-body { flex: 1; min-width: 0; }
  .sv-strip-label {
    font-size: 11px; font-weight: 300; color: var(--secondary-text-color); letter-spacing: 0.02em;
  }
  .sv-strip-value {
    font-size: 22px; font-weight: 200; color: var(--primary-text-color);
    letter-spacing: -0.03em; line-height: 1.1;
  }
  .sv-strip-value sup { font-size: 11px; vertical-align: super; }
  .sv-strip-badge {
    background: var(--ha-chip-background-color, rgba(201,169,110,0.1));
    border: 1px solid rgba(201,169,110,0.2); border-radius: 6px; padding: 3px 8px;
    font-size: 10px; font-weight: 300; color: var(--primary-color);
    white-space: nowrap; letter-spacing: 0.04em; flex-shrink: 0;
  }
  .sv-strip-badge.cool {
    background: rgba(110,182,201,0.1); border-color: rgba(110,182,201,0.2);
    color: var(--info-color, #6EB6C9);
  }
`;

class SavantHomeCard extends HTMLElement {
  constructor() {
    super();
    this._shadow  = this.attachShadow({ mode: 'open' });
    this._tickId  = null;
    this._hass    = null;
    this._config  = null;
    this._prevSig = null;
  }

  set hass(hass) {
    this._hass = hass;
    const sig = this._stateSig(hass);
    if (sig !== this._prevSig) {
      this._prevSig = sig;
      this._render();
    }
  }

  setConfig(config) {
    this._config  = config;
    this._prevSig = null;
  }

  getCardSize() { return 6; }

  connectedCallback() {
    this._tickId = setInterval(() => this._tickTime(), 60_000);
    if (this._hass && this._config) this._render();
  }

  disconnectedCallback() { clearInterval(this._tickId); }

  _stateSig(hass) {
    if (!this._config?.areas) return '';
    return this._config.areas.flatMap(area =>
      (this._config.entityMap?.[area.area_id] ?? []).map(e => {
        const s = hass.states[e.entity_id];
        if (!s) return `${e.entity_id}:null`;
        const d = getDomain(e.entity_id);
        if (d === 'light')        return `${e.entity_id}:${s.state}`;
        if (d === 'climate')      return `${e.entity_id}:${s.attributes.current_temperature}`;
        if (d === 'media_player') return `${e.entity_id}:${s.state}`;
        if (d === 'sensor' && s.attributes.device_class === 'temperature')
          return `${e.entity_id}:${s.state}`;
        return '';
      })
    ).join('|');
  }

  _tickTime() {
    const el = this._shadow.querySelector('.sv-time-pill');
    if (el) el.textContent = this._formatDateTime();
  }

  _formatDateTime() {
    const now = new Date();
    return [
      now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ].join(' · ');
  }

  _greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  _areaSummary(area) {
    const entities = this._config.entityMap?.[area.area_id] ?? [];
    let activeLights = 0, totalLights = 0, mediaActive = 0, temp = null;
    for (const e of entities) {
      const state = this._hass.states[e.entity_id];
      if (!state) continue;
      const d = getDomain(e.entity_id);
      if (d === 'light') { totalLights++; if (state.state === 'on') activeLights++; }
      if (d === 'climate' && temp === null)
        temp = state.attributes.current_temperature ?? null;
      if (d === 'sensor' && state.attributes.device_class === 'temperature' && temp === null) {
        const n = parseFloat(state.state);
        if (!isNaN(n)) temp = n;
      }
      if (d === 'media_player' && !['off','idle','standby','unavailable'].includes(state.state))
        mediaActive++;
    }
    return { activeLights, totalLights, mediaActive, temp };
  }

  _render() {
    if (!this._config || !this._hass) return;
    const { areas = [], scenes, indoor_temp_entity, outdoor_temp_entity } = this._config;
    const sceneNames = scenes ?? ['Morning', 'Day', 'Evening', 'Away', 'Sleep', 'Cinema'];

    const areaTilesHtml = areas.map(area => {
      const { activeLights, totalLights, mediaActive, temp } = this._areaSummary(area);
      const isActive  = activeLights > 0 || mediaActive > 0;
      const showEmpty = totalLights === 0 && mediaActive === 0 && temp == null;
      return `
        <a class="sv-area-tile${isActive ? ' active' : ''}" href="/lovelace/${area.area_id}">
          <div class="sv-area-name">${area.name}</div>
          <div class="sv-area-meta">
            ${totalLights > 0 ? `
              <div class="sv-area-stat ${activeLights > 0 ? 'lit' : ''}">
                <div class="sv-dot ${activeLights > 0 ? 'lit' : ''}"></div>
                ${activeLights > 0 ? `${activeLights} light${activeLights !== 1 ? 's' : ''}` : 'Lights off'}
              </div>` : ''}
            ${mediaActive > 0 ? `
              <div class="sv-area-stat media">
                <div class="sv-dot media"></div>Playing
              </div>` : ''}
            ${temp != null ? `<div class="sv-area-temp">${Math.round(temp)}<sup>°</sup></div>` : ''}
            ${showEmpty ? `<div class="sv-area-stat" style="opacity:.4;">No entities</div>` : ''}
          </div>
        </a>`;
    }).join('');

    const indoorState  = indoor_temp_entity  ? this._hass.states[indoor_temp_entity]  : null;
    const outdoorState = outdoor_temp_entity ? this._hass.states[outdoor_temp_entity] : null;
    const envHtml = (indoorState || outdoorState) ? `
      <div class="sv-label" style="margin-top:24px;">Environment</div>
      <div class="sv-strip">
        ${indoorState ? `
          <div class="sv-strip-card">
            <div class="sv-strip-icon">🏠</div>
            <div class="sv-strip-body">
              <div class="sv-strip-label">Inside</div>
              <div class="sv-strip-value">${Math.round(parseFloat(indoorState.state))}<sup>°</sup></div>
            </div>
            <div class="sv-strip-badge">${indoorState.attributes.hvac_action ?? indoorState.state}</div>
          </div>` : ''}
        ${outdoorState ? `
          <div class="sv-strip-card">
            <div class="sv-strip-icon">🌤</div>
            <div class="sv-strip-body">
              <div class="sv-strip-label">Outside</div>
              <div class="sv-strip-value">${Math.round(parseFloat(outdoorState.state))}<sup>°</sup></div>
            </div>
            <div class="sv-strip-badge cool">${outdoorState.attributes.friendly_name ?? 'Outdoor'}</div>
          </div>` : ''}
      </div>` : '';

    this._shadow.innerHTML = `
      <style>${HOME_CSS}</style>
      <div class="sv-header">
        <div class="sv-greeting">${this._greeting()}, <em>Home</em></div>
        <div class="sv-time-pill">${this._formatDateTime()}</div>
      </div>
      <div class="sv-scenes">
        ${sceneNames.map(s => `<div class="sv-scene-pill">${s}</div>`).join('')}
      </div>
      ${areas.length > 0 ? `
        <div class="sv-label">Rooms</div>
        <div class="sv-area-grid">${areaTilesHtml}</div>
      ` : `
        <p style="color:var(--secondary-text-color);font-weight:300;font-size:13px;line-height:1.6;">
          No areas found. Create areas in
          <strong style="color:var(--primary-text-color);font-weight:400;">Settings → Areas</strong>
          and assign devices to them.
        </p>`}
      ${envHtml}
    `;

    this._shadow.querySelectorAll('.sv-scene-pill').forEach(pill => {
      const entityId = (this._config.scene_entities ?? {})[pill.textContent.trim()];
      if (entityId) {
        pill.addEventListener('click', () =>
          this._hass.callService('scene', 'turn_on', { entity_id: entityId })
        );
      }
    });
  }
}

// ─── SavantSectionCard ────────────────────────────────────────────────────────

class SavantSectionCard extends HTMLElement {
  set hass(_) {}
  setConfig(config) { this._config = config; this._render(); }
  getCardSize() { return 1; }

  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    const { title = '', count = 0 } = this._config ?? {};
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --ha-card-background:   transparent;
          --ha-card-box-shadow:   none;
          --ha-card-border-width: 0px;
          --ha-card-border-color: transparent;
        }
        .sv-section {
          display: flex; align-items: center; gap: 10px; padding: 8px 2px 2px;
        }
        .sv-section-title {
          font-family: var(--ha-font-family, 'DM Sans', sans-serif);
          font-size: 10px; font-weight: 300; text-transform: uppercase;
          letter-spacing: 0.1em; color: var(--secondary-text-color);
          white-space: nowrap; opacity: 0.7;
        }
        .sv-section-rule {
          flex: 1; height: 1px;
          background: var(--divider-color, rgba(255,255,255,0.06));
        }
        .sv-section-count {
          font-family: var(--ha-font-family, 'DM Sans', sans-serif);
          font-size: 10px; font-weight: 300;
          color: var(--disabled-text-color, #3E3E48); white-space: nowrap;
        }
      </style>
      <div class="sv-section">
        <span class="sv-section-title">${title}</span>
        <div class="sv-section-rule"></div>
        ${count > 1 ? `<span class="sv-section-count">${count}</span>` : ''}
      </div>
    `;
  }
}

// ─── Card builders ────────────────────────────────────────────────────────────

const buildLightCards = entities => ({
  type: 'grid', square: false, columns: 2,
  cards: entities.map(e => ({
    type: 'tile', entity: e.entity_id,
    features: [{ type: 'light-brightness' }],
  })),
});

const buildClimateCards = entities =>
  entities.map(e => ({ type: 'thermostat', entity: e.entity_id }));

const buildMediaCards = entities =>
  entities.map(e => ({ type: 'media-control', entity: e.entity_id }));

const buildCoverCards = entities => ({
  type: 'grid', square: false, columns: 2,
  cards: entities.map(e => ({
    type: 'tile', entity: e.entity_id,
    features: [{ type: 'cover-open-close' }],
  })),
});

const buildTileGrid = (entities, columns = 2) => ({
  type: 'grid', square: false, columns,
  cards: entities.map(e => ({ type: 'tile', entity: e.entity_id })),
});

// ─── View generators ──────────────────────────────────────────────────────────

const generateHomeView = config => ({
  cards: [{
    type: 'custom:savant-home-card',
    areas:               config.areas,
    entityMap:           config.entityMap,
    scenes:              config.scenes,
    scene_entities:      config.scene_entities,
    indoor_temp_entity:  config.indoor_temp_entity,
    outdoor_temp_entity: config.outdoor_temp_entity,
  }],
});

const generateAreaView = (config, hass) => {
  const areaEntities = getAreaEntities(config.area.area_id, config.entities, config.devices);
  const grouped      = groupByDomain(areaEntities);
  const cards        = [];
  const isVisible    = e => { const s = hass.states[e.entity_id]; return s && s.state !== 'unavailable'; };

  for (const domain of DOMAIN_ORDER) {
    const visible = (grouped[domain] ?? []).filter(isVisible);
    if (!visible.length) continue;
    const label = DOMAIN_LABELS[domain];
    if (!label) continue;

    cards.push({ type: 'custom:savant-section-card', title: label, count: visible.length });
    switch (domain) {
      case 'light':        cards.push(buildLightCards(visible));      break;
      case 'climate':      cards.push(...buildClimateCards(visible)); break;
      case 'media_player': cards.push(...buildMediaCards(visible));   break;
      case 'cover':        cards.push(buildCoverCards(visible));      break;
      default:             cards.push(buildTileGrid(visible));
    }
  }

  // Merge binary_sensor + sensor into one section
  const sensors = [
    ...(grouped['binary_sensor'] ?? []),
    ...(grouped['sensor']        ?? []),
  ].filter(isVisible);
  if (sensors.length) {
    cards.push({ type: 'custom:savant-section-card', title: 'Sensors', count: sensors.length });
    cards.push(buildTileGrid(sensors));
  }

  if (cards.length === 0) {
    cards.push({
      type: 'markdown',
      content: `*No entities assigned to **${config.area.name}**.*\n\nGo to **Settings → Areas** and assign devices or entities to this area.`,
    });
  }

  return { cards };
};

// ─── SavantDashboardStrategy ──────────────────────────────────────────────────
//
// HA strategy API (2021.5+):  static async generate(config, hass)
// config = the strategy object from the dashboard YAML (minus the type key)
// hass   = the HA websocket connection

class SavantDashboardStrategy extends HTMLElement {

  static getCreateSuggestions(_hass) {
    return {
      title: 'Savant',
      icon:  'mdi:home-variant-outline',
    };
  }

  static async generate(config, hass) {
    let areas, entities, devices;
    try {
      [areas, entities, devices] = await Promise.all([
        hass.callWS({ type: 'config/area_registry/list' }),
        hass.callWS({ type: 'config/entity_registry/list' }),
        hass.callWS({ type: 'config/device_registry/list' }),
      ]);
    } catch (err) {
      console.error('[Savant Strategy] Failed to load registries:', err);
      return {
        views: [{
          title: 'Error', path: 'home',
          cards: [{
            type: 'markdown',
            content: `## Savant Strategy — Load Error\n\n\`${err.message}\`\n\nCheck the browser console for details.`,
          }],
        }],
      };
    }

    const sortedAreas = [...areas].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );

    // Pre-compute entity map once so the home card view doesn't need
    // to hold the full registries at render time.
    const entityMap = Object.fromEntries(
      sortedAreas.map(a => [a.area_id, getAreaEntities(a.area_id, entities, devices)])
    );

    // User-facing options are passed through config (from dashboard YAML or
    // create-dialog form). Spread them into every view strategy config.
    const userOpts = {
      scenes:              config.scenes,
      scene_entities:      config.scene_entities,
      indoor_temp_entity:  config.indoor_temp_entity,
      outdoor_temp_entity: config.outdoor_temp_entity,
    };

    return {
      views: [
        // ── Home overview ────────────────────────────────────────────────
        {
          title: config.title || 'Home',
          path:  'home',
          icon:  'mdi:home-variant-outline',
          strategy: {
            // 'custom:savant' resolves to ll-strategy-view-savant
            type: 'custom:savant',
            view: 'home',
            areas: sortedAreas,
            entityMap,
            entities,
            devices,
            ...userOpts,
          },
        },
        // ── One view per area ────────────────────────────────────────────
        ...sortedAreas.map(area => ({
          title: area.name,
          path:  area.area_id,
          icon:  area.icon ?? 'mdi:home-outline',
          strategy: {
            type: 'custom:savant',
            view: 'area',
            area,
            areas: sortedAreas,
            entities,
            devices,
            ...userOpts,
          },
        })),
      ],
    };
  }
}

// ─── SavantViewStrategy ───────────────────────────────────────────────────────
//
// HA view strategy API: static async generate(config, hass)
// Registered as ll-strategy-view-savant → referenced as type: custom:savant

class SavantViewStrategy extends HTMLElement {
  static async generate(config, hass) {
    return config.view === 'home'
      ? generateHomeView(config)
      : generateAreaView(config, hass);
  }
}

// ─── Register custom elements ─────────────────────────────────────────────────

[
  ['savant-home-card',             SavantHomeCard],
  ['savant-section-card',          SavantSectionCard],
  // ll-strategy-dashboard-{name} → dashboard strategy type custom:{name}
  ['ll-strategy-dashboard-savant', SavantDashboardStrategy],
  // ll-strategy-view-{name}      → view strategy type custom:{name}
  ['ll-strategy-view-savant',      SavantViewStrategy],
].forEach(([name, cls]) => {
  if (!customElements.get(name)) customElements.define(name, cls);
});

// ─── HA 2026.5 UI discovery ───────────────────────────────────────────────────
//
// Required fields per developer docs:
//   type         — strategy identifier (without custom: prefix)
//   strategyType — must be "dashboard" to appear in the New Dashboard dialog

window.customStrategies ??= [];
window.customStrategies.push({
  type:             'savant',
  strategyType:     'dashboard',
  name:             'Savant',
  description:      'Luxury home-automation aesthetic. Auto-generates a view per area with no manual card configuration.',
  documentationURL: 'https://github.com/YOUR_USERNAME/savant-ha-strategy',
});

// ─── Console banner ───────────────────────────────────────────────────────────

console.info(
  '%c SAVANT STRATEGY %c v1.0.0 ',
  'background:#C9A96E;color:#0C0C0F;padding:2px 6px;border-radius:3px 0 0 3px;font-weight:700;font-size:11px;',
  'background:#18181C;color:#C9A96E;padding:2px 6px;border-radius:0 3px 3px 0;font-size:11px;'
);
