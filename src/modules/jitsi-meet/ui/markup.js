import { escapeHtml } from "/static/reuse/escape-html.js";

export function buildStageMarkup(i18n) {
    return `
    <div class="jitsi-meeting-stage card-elevated">
      <header class="jitsi-stage-header">
        <h3>${escapeHtml(i18n.t("module.jitsi_meet.overlay.title"))}</h3>
        <div id="jitsi-share-button-slot" class="jitsi-share-button-slot"></div>
      </header>
      <div class="jitsi-stage-frame-wrap">
        <div id="jitsi-meeting-frame" class="jitsi-stage-frame" title="${escapeHtml(i18n.t("ui.reuse.meeting"))}" hidden></div>
        <div id="jitsi-overlay" class="jitsi-overlay">
          <div id="jitsi-staged-participants" class="jitsi-staged-participants" role="list"></div>
          <h3 class="jitsi-overlay-title">${escapeHtml(i18n.t("module.jitsi_meet.overlay.title"))}</h3>
          <p id="jitsi-overlay-message" class="jitsi-overlay-message">${escapeHtml(i18n.t("module.jitsi_meet.overlay.select_participants"))}</p>
          <div class="jitsi-overlay-actions">
            <button id="jitsi-start-btn" class="btn-animated" type="button" disabled>${escapeHtml(i18n.t("module.jitsi_meet.overlay.start_meeting"))}</button>
            <button id="jitsi-auth-btn" class="btn-cancel" type="button" hidden>${escapeHtml(i18n.t("module.jitsi_meet.overlay.authenticate"))}</button>
            <button id="jitsi-reclaim-btn" class="btn-confirm" type="button" hidden>${escapeHtml(i18n.t("module.jitsi_meet.overlay.remain_in_meeting"))}</button>
            <button id="jitsi-leave-alone-btn" class="btn-cancel" type="button" hidden>${escapeHtml(i18n.t("module.jitsi_meet.overlay.leave_meeting"))}</button>
            <button id="jitsi-remain-alone-btn" class="btn-confirm" type="button" hidden>${escapeHtml(i18n.t("module.jitsi_meet.overlay.remain_in_meeting"))}</button>
          </div>
          <div id="jitsi-loading" class="jitsi-loading" hidden>
            <span id="jitsi-loading-indicator" class="jitsi-spinner" aria-hidden="true"></span>
            <span id="jitsi-loading-text">${escapeHtml(i18n.t("module.jitsi_meet.overlay.loading"))}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function buildChatMarkup(i18n) {
    return `
    <aside class="jitsi-chat-pane jitsi-chat-disabled card-elevated" aria-disabled="true">
      <header class="jitsi-chat-header">
        <h3 id="jitsi-chat-heading">${escapeHtml(i18n.t("module.jitsi_meet.chat.heading"))}</h3>
        <button id="jitsi-chat-return-btn" class="jitsi-chat-return-btn" type="button" hidden>${escapeHtml(i18n.t("module.jitsi_meet.chat.return_to_meeting"))}</button>
      </header>
      <div id="jitsi-chat-participant-strip" class="jitsi-chat-participant-strip" role="list" aria-label="${escapeHtml(i18n.t("module.jitsi_meet.chat.participants"))}"></div>
      <div id="jitsi-chat-thread" class="jitsi-chat-thread" aria-live="polite" aria-busy="true"></div>
      <form id="jitsi-chat-form" class="jitsi-chat-form" hidden>
        <textarea id="jitsi-chat-input" class="jitsi-chat-input" rows="3" placeholder="${escapeHtml(i18n.t("module.jitsi_meet.chat.placeholder"))}" disabled></textarea>
      </form>
    </aside>
  `;
}

export function buildParticipantsMarkup(i18n) {
    return `
    <section class="jitsi-participants-pane card-elevated">
      <header class="jitsi-participants-header">
        <h3>${escapeHtml(i18n.t("module.jitsi_meet.participants.heading"))}</h3>
        <button id="jitsi-find-participants-btn" class="btn-cancel" type="button">
          ${escapeHtml(i18n.t("module.jitsi_meet.participants.search"))}
        </button>
      </header>
      <div class="jitsi-participants-grid">
        <div class="jitsi-participants-grid-column">
          <p class="jitsi-participants-pool-label">${escapeHtml(i18n.t("module.jitsi_meet.participants.available"))}</p>
          <div id="jitsi-available-participants" class="jitsi-avatar-pool" role="list"></div>
        </div>
        <div class="jitsi-participants-grid-column">
          <p class="jitsi-participants-pool-label">${escapeHtml(i18n.t("module.jitsi_meet.participants.active_meetings"))}</p>
          <div id="jitsi-active-meetings" class="jitsi-active-meetings" role="grid"></div>
        </div>
      </div>
    </section>
  `;
}
