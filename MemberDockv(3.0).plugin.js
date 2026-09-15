/**
 * @name MemberDock
 * @author Dynamiteelf
 * @description MacOS dock style members list that expands when mouse gets close. Quick info and options panel when hovering over a members name join date/server join/ID.
 * @version 3.0
 * @authorId 709779118568505424
 * @donate https://paypal.me/ABlenkharn
 * @source 
 */

module.exports = class MemberDock {
  constructor() {
    this.api = new BdApi("MemberDock");
    this.defaultSettings = {
      trackWidth: 52,
      panelExpanded: 240,
      animSpeed: 380,
      collapseDelay: 80,
      infoHoverDelay: 1200,
      panelBg: "#000000",
      panelBorder: "#e74c3c",
    };
    this.settings = {};
    this.hoverTimer = null;
    this.activeUserId = null;
    this.panel = null;
    this.styleId = "MemberDock-css";
    this.infoStyleId = "MemberDock-info-css";
    this.onMove = this.onMove.bind(this);
  }

  start() {
    const saved = this.api.Data.load("settings") || {};
    // Drop removed keys from older versions
    delete saved.fadeSpeed;
    delete saved.panelOutlineOffset;
    this.settings = Object.assign({}, this.defaultSettings, saved);
    this.cacheModules();
    this.applyStyles();
    document.addEventListener("mousemove", this.onMove, true);
  }

  stop() {
    document.removeEventListener("mousemove", this.onMove, true);
    this.clearTimer();
    this.hidePanel();
    BdApi.DOM.removeStyle(this.styleId);
    BdApi.DOM.removeStyle(this.infoStyleId);
  }

  getSettingsPanel() {
    const wrap = document.createElement("div");
    wrap.style.cssText = "padding:12px;display:flex;flex-direction:column;gap:14px;color:var(--text-default,#dcddde);font-family:var(--font-primary);";

    const makeRow = (label, input, hint) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;flex-direction:column;gap:4px;";
      const lab = document.createElement("label");
      lab.textContent = label;
      lab.style.cssText = "font-size:12px;font-weight:600;color:var(--header-secondary,#b5bac1);";
      row.appendChild(lab);
      row.appendChild(input);
      if (hint) {
        const h = document.createElement("div");
        h.textContent = hint;
        h.style.cssText = "font-size:11px;color:var(--text-muted,#949ba4);";
        row.appendChild(h);
      }
      return row;
    };

    const num = (key, min, max, step = 1) => {
      const input = document.createElement("input");
      input.type = "number";
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(this.settings[key]);
      input.style.cssText = "width:120px;padding:6px 8px;border-radius:4px;border:1px solid var(--background-modifier-accent,#3f4147);background:var(--input-background,#1e1f22);color:var(--text-default);";
      input.addEventListener("change", () => {
        let v = parseFloat(input.value);
        if (Number.isNaN(v)) v = this.defaultSettings[key];
        v = Math.min(max, Math.max(min, v));
        input.value = String(v);
        this.settings[key] = v;
        this.saveAndApply();
      });
      return input;
    };

    const color = (key) => {
      const input = document.createElement("input");
      input.type = "color";
      input.value = this.settings[key];
      input.style.cssText = "width:48px;height:32px;border:none;background:transparent;cursor:pointer;";
      input.addEventListener("input", () => {
        this.settings[key] = input.value;
        this.saveAndApply();
      });
      return input;
    };

    wrap.appendChild(makeRow("Collapsed rail width (px)", num("trackWidth", 40, 80)));
    wrap.appendChild(makeRow("Expanded panel width (px)", num("panelExpanded", 180, 320)));
    wrap.appendChild(makeRow("Animation speed (ms)", num("animSpeed", 0, 1000, 10), "How long expand/collapse takes. 0 = instant."));
    wrap.appendChild(makeRow("Collapse delay (ms)", num("collapseDelay", 0, 500, 10), "Wait before collapsing after mouse leaves. Usernames fade with this."));
    wrap.appendChild(makeRow("Info panel hover delay (ms)", num("infoHoverDelay", 200, 3000, 50)));
    wrap.appendChild(makeRow("Info panel background", color("panelBg")));
    wrap.appendChild(makeRow("Info panel border color", color("panelBorder")));

    const note = document.createElement("div");
    note.style.cssText = "font-size:12px;color:var(--text-muted,#949ba4);margin-top:4px;";
    note.textContent = "Disable any old MemberDock theme CSS. Usernames fade in sync with collapse delay — no separate fade setting.";
    wrap.appendChild(note);

    return wrap;
  }

  saveAndApply() {
    this.api.Data.save("settings", this.settings);
    this.applyStyles();
  }

  cacheModules() {
    const { Webpack } = BdApi;
    this.UserStore = Webpack.getStore("UserStore");
    this.GuildMemberStore = Webpack.getStore("GuildMemberStore");
    this.SelectedGuildStore = Webpack.getStore("SelectedGuildStore");
  }

  applyStyles() {
    const s = this.settings;
    const anim = s.animSpeed;
    const delay = s.collapseDelay;

    BdApi.DOM.removeStyle(this.styleId);
    BdApi.DOM.removeStyle(this.infoStyleId);

    BdApi.DOM.addStyle(this.styleId, `
:root {
  --md-track-width: ${s.trackWidth}px;
  --md-panel-expanded: ${s.panelExpanded}px;
  --md-anim-speed: ${anim}ms;
  --md-anim-ease: cubic-bezier(0.4, 0, 0.2, 1);
  --md-collapse-delay: ${delay}ms;
}

[class*="chat_"] > [class*="content_"]:has([class*="membersWrap"]),
[class*="chat_"] > [class*="content_"]:has(aside[class*="membersWrap"]) {
  display: flex !important;
  flex-direction: row !important;
  align-items: stretch !important;
  flex: 1 1 auto !important;
  min-width: 0 !important;
  min-height: 0 !important;
  height: 100% !important;
  position: relative !important;
  overflow: hidden !important;
}

[class*="chat_"] [class*="chatContent"],
[class*="chat_"] [class*="chatContent_"] {
  flex: 1 1 auto !important;
  min-width: 0 !important;
  min-height: 0 !important;
  width: auto !important;
  max-width: none !important;
  height: 100% !important;
  align-self: stretch !important;
  transition: none !important;
}

[class*="chat_"] [class*="chatContent"] [class*="messageContent"],
[class*="chat_"] [class*="chatContent"] [class*="markup"],
[class*="chat_"] [class*="chatContent_"] [class*="messageContent"],
[class*="chat_"] [class*="chatContent_"] [class*="markup"] {
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
}

/* Members container — animate only width */
[class*="chat_"] > [class*="content_"] > [class*="container_"]:has([class*="membersWrap"]),
[class*="chat_"] > [class*="content_"] > [class*="container_"]:has(aside[class*="membersWrap"]) {
  position: relative !important;
  flex: 0 0 auto !important;
  width: var(--md-track-width) !important;
  min-width: var(--md-track-width) !important;
  max-width: var(--md-panel-expanded) !important;
  height: 100% !important;
  min-height: 0 !important;
  align-self: stretch !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
  background: var(--background-secondary, var(--bg-overlay-chat, #2b2d31)) !important;
  border-left: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06)) !important;
  transition: width var(--md-anim-speed) var(--md-anim-ease) var(--md-collapse-delay) !important;
  will-change: width;
  contain: layout style;
}

[class*="chat_"] > [class*="content_"] > [class*="container_"]:has([class*="membersWrap"]):hover,
[class*="chat_"] > [class*="content_"] > [class*="container_"]:has(aside[class*="membersWrap"]):hover,
html.md-pinned [class*="chat_"] > [class*="content_"] > [class*="container_"]:has([class*="membersWrap"]) {
  width: var(--md-panel-expanded) !important;
  transition-delay: 0ms !important;
}

[class*="chat_"] > [class*="content_"] > [class*="container_"]:has([class*="membersWrap"])::before {
  content: "";
  position: absolute;
  left: -12px;
  top: 0;
  bottom: 0;
  width: 12px;
  z-index: 3;
}

[class*="chat_"] aside[class*="membersWrap"],
[class*="chat_"] [class*="membersWrap"],
[class*="chat_"] [class*="membersWrap_"] {
  position: relative !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  left: auto !important;
  inset: auto !important;
  float: none !important;
  transform: none !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
  height: 100% !important;
  min-height: 0 !important;
  max-height: none !important;
  display: flex !important;
  flex-direction: column !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
  z-index: 2 !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  --custom-member-list-width: var(--md-panel-expanded) !important;
}

[class*="chat_"] [class*="membersWrap"] [class*="members_"],
[class*="chat_"] [class*="membersWrap"] [class*="members__"],
[class*="chat_"] aside[class*="membersWrap"] [class*="members_"] {
  width: var(--md-panel-expanded) !important;
  min-width: var(--md-panel-expanded) !important;
  max-width: var(--md-panel-expanded) !important;
  height: 100% !important;
  max-height: 100% !important;
  flex: 1 1 auto !important;
  min-height: 0 !important;
  box-sizing: border-box !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

[class*="chat_"] [class*="membersWrap"] [class*="members_"]::-webkit-scrollbar,
[class*="chat_"] [class*="membersWrap"] [class*="members__"]::-webkit-scrollbar,
[class*="chat_"] aside[class*="membersWrap"] [class*="members_"]::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
}

[class*="chat_"] [class*="membersWrap"] [class*="scrollbarGutterStable"],
[class*="chat_"] [class*="membersWrap"] [class*="scrollbarGutter"] {
  scrollbar-gutter: auto !important;
}

/* Names: fade duration matches anim speed, delay matches collapse delay */
[class*="chat_"] [class*="membersWrap"]
  :is([class*="name_"], [class*="username"], [class*="activity_"], [class*="subText"], [class*="botTag"]) {
  transition: opacity var(--md-anim-speed) ease var(--md-collapse-delay) !important;
}

[class*="chat_"] > [class*="content_"] > [class*="container_"]:has([class*="membersWrap"]):not(:hover)
  :is([class*="name_"], [class*="username"], [class*="activity_"], [class*="subText"], [class*="botTag"]) {
  opacity: 0 !important;
}

[class*="chat_"] > [class*="content_"] > [class*="container_"]:has([class*="membersWrap"]):hover
  :is([class*="name_"], [class*="username"], [class*="activity_"], [class*="subText"], [class*="botTag"]),
html.md-pinned [class*="chat_"] [class*="membersWrap"]
  :is([class*="name_"], [class*="username"], [class*="activity_"], [class*="subText"], [class*="botTag"]) {
  opacity: 1 !important;
  transition-delay: 0ms !important;
}

[class*="chat_"] [class*="membersWrap"]
  :is([class*="membersGroup"], [class*="membersGroup_"], h3[class*="membersGroup"]) {
  opacity: 1 !important;
  visibility: visible !important;
  height: auto !important;
  min-height: 24px !important;
  overflow: hidden !important;
  white-space: nowrap !important;
}

[class*="chat_"] [class*="membersWrap"] [class*="member_"] {
  opacity: 1 !important;
  visibility: visible !important;
}

[class*="chat_"] [class*="membersWrap"]
  :is([class*="avatar_"], [class*="avatar"], img[class*="avatar"]) {
  opacity: 1 !important;
  visibility: visible !important;
}

@media (prefers-reduced-motion: reduce) {
  [class*="chat_"] > [class*="content_"] > [class*="container_"]:has([class*="membersWrap"]),
  [class*="chat_"] [class*="membersWrap"]
    :is([class*="name_"], [class*="username"], [class*="activity_"], [class*="subText"], [class*="botTag"]) {
    transition: none !important;
  }
}
`);

    BdApi.DOM.addStyle(this.infoStyleId, `
#mdock-info-panel {
  position: fixed;
  z-index: 100000;
  min-width: 260px;
  max-width: 320px;
  padding: 12px 14px;
  background: ${s.panelBg};
  color: #dcddde;
  font-family: var(--font-primary, "gg sans", "Noto Sans", sans-serif);
  font-size: 13px;
  line-height: 1.45;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.55);
  outline: 1px solid ${s.panelBorder};
  outline-offset: 4px;
  pointer-events: auto;
  user-select: text;
}
#mdock-info-panel .mdock-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 10px;
}
#mdock-info-panel .mdock-row:last-child { margin-bottom: 0; }
#mdock-info-panel .mdock-label {
  color: #a3a6aa;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}
#mdock-info-panel .mdock-value {
  color: #fff;
  word-break: break-all;
}
#mdock-info-panel .mdock-name {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 12px;
}
`);
  }

  onMove(e) {
    const memberEl = e.target?.closest?.('[class*="member_"]');
    const inList = e.target?.closest?.('[class*="membersWrap"], [class*="members_"]');

    if (!memberEl || !inList) {
      if (!e.target?.closest?.("#mdock-info-panel")) {
        this.clearTimer();
        this.hidePanel();
        this.activeUserId = null;
      }
      return;
    }

    const userId = this.extractUserId(memberEl);
    if (!userId) return;

    if (userId === this.activeUserId && this.panel) return;

    if (userId !== this.activeUserId) {
      this.clearTimer();
      this.hidePanel();
      this.activeUserId = userId;
      this.hoverTimer = setTimeout(() => {
        this.showPanel(userId, memberEl);
      }, this.settings.infoHoverDelay);
    }
  }

  clearTimer() {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
  }

  extractUserId(memberEl) {
    const img = memberEl.querySelector("img[src*='avatars'], img[src*='/users/']");
    if (img?.src) {
      const m = img.src.match(/\/(?:avatars|users)\/(\d{17,20})/);
      if (m) return m[1];
    }
    const clickable = memberEl.querySelector("[data-list-item-id]");
    if (clickable) {
      const id = clickable.getAttribute("data-list-item-id");
      const m = id && id.match(/(\d{17,20})$/);
      if (m) return m[1];
    }
    const any = memberEl.querySelector("[class*='avatar']");
    if (any) {
      const props = this.getReactProps(memberEl) || this.getReactProps(any);
      const uid = props?.user?.id || props?.userId || props?.member?.userId;
      if (uid) return String(uid);
    }
    return null;
  }

  getReactProps(node) {
    const key = Object.keys(node || {}).find((k) => k.startsWith("__reactProps$") || k.startsWith("__reactFiber$"));
    if (!key) return null;
    if (key.startsWith("__reactProps$")) return node[key];
    let fiber = node[key];
    for (let i = 0; i < 12 && fiber; i++) {
      const p = fiber.memoizedProps || fiber.pendingProps;
      if (p && (p.user || p.userId || p.member)) return p;
      fiber = fiber.return;
    }
    return null;
  }

  snowflakeToDate(id) {
    try {
      const ms = Number((BigInt(id) >> 22n) + 1420070400000n);
      return new Date(ms);
    } catch {
      return null;
    }
  }

  formatDate(d) {
    if (!d || !(d instanceof Date) || isNaN(d)) return "Unknown";
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  showPanel(userId, memberEl) {
    this.hidePanel();
    const guildId = this.SelectedGuildStore?.getGuildId?.();
    const user = this.UserStore?.getUser?.(userId);
    const member = guildId ? this.GuildMemberStore?.getMember?.(guildId, userId) : null;

    const created = user?.createdAt ? new Date(user.createdAt) : this.snowflakeToDate(userId);
    const joined = member?.joinedAt ? new Date(member.joinedAt) : null;
    const displayName = member?.nick || user?.globalName || user?.username || userId;

    const panel = document.createElement("div");
    panel.id = "mdock-info-panel";
    panel.innerHTML = `
      <div class="mdock-name">${this.escape(displayName)}</div>
      <div class="mdock-row">
        <span class="mdock-label">Discord ID</span>
        <span class="mdock-value">${this.escape(userId)}</span>
      </div>
      <div class="mdock-row">
        <span class="mdock-label">Discord joined</span>
        <span class="mdock-value">${this.formatDate(created)}</span>
      </div>
      <div class="mdock-row">
        <span class="mdock-label">Server joined</span>
        <span class="mdock-value">${joined ? this.formatDate(joined) : "Unknown"}</span>
      </div>
    `;

    panel.addEventListener("mouseenter", () => this.clearTimer());
    panel.addEventListener("mouseleave", () => {
      this.hidePanel();
      this.activeUserId = null;
    });

    document.body.appendChild(panel);
    this.panel = panel;

    const rect = memberEl.getBoundingClientRect();
    const list = memberEl.closest('[class*="membersWrap"], [class*="container_"]');
    const listRect = list ? list.getBoundingClientRect() : rect;
    const pr = panel.getBoundingClientRect();

    let left = listRect.left - pr.width - 12;
    let top = rect.top;
    if (left < 8) left = 8;
    if (top + pr.height > window.innerHeight - 8) top = Math.max(8, window.innerHeight - pr.height - 8);
    if (top < 8) top = 8;

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  hidePanel() {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
  }

  escape(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
};
