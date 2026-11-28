import type { RealtimeEvent, User, AppNotification } from '../types/index.ts';
import { getClientDeviceId, getClientSessionId } from './deviceIdentity.ts';
import { resolveUrl, getStoredToken } from './api.ts';

class RealtimeSyncManager {
  private eventSource: EventSource | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private lastSeq = 0;
  private lastDbVersion = 0;
  private currentUser: User | null = null;
  private currentToken: string | null = null;
  private isStarted = false;
  private isPolling = false;
  private seenEventIds = new Set<string>();
  private seenAdminDedupeKeys = new Set<string>();

  public start(token: string, user: User) {
    if (!token || !user) return;

    const sameSession = this.isStarted && this.currentToken === token && this.currentUser?.id === user.id;
    this.currentUser = user;
    this.currentToken = token;

    if (sameSession) return;

    this.stopInternal(false);
    this.isStarted = true;
    this.connectSSE();
    this.setupBroadcastChannel();
    this.setupFallbackPoll();
  }

  public updateUser(user: User | null) {
    this.currentUser = user;
  }

  public stop() {
    this.stopInternal(true);
  }

  private stopInternal(clearSeen: boolean) {
    this.isStarted = false;
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch (_) {}
      this.eventSource = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch (_) {}
      this.broadcastChannel = null;
    }
    if (clearSeen) {
      this.lastSeq = 0;
      this.lastDbVersion = 0;
      this.seenEventIds.clear();
      this.seenAdminDedupeKeys.clear();
    }
  }

  private setupBroadcastChannel() {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    try {
      this.broadcastChannel = new BroadcastChannel('tamvesta_admin_sync');
      this.broadcastChannel.onmessage = (e) => {
        const msg = e.data;
        if (!msg) return;
        if (msg.type === 'REFRESH_ALL') {
          window.dispatchEvent(
            new CustomEvent('tamvesta_realtime_sync', {
              detail: {
                id: `bc_${msg.timestamp || Date.now()}`,
                seq: this.lastSeq,
                type: 'sync_update',
                entity: msg.entity || 'system',
                action: 'updated',
                createdAt: new Date().toISOString(),
              },
            })
          );
        }
      };
    } catch (_) {}
  }

  private connectSSE() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined' || !this.currentToken) return;
    try {
      const deviceId = getClientDeviceId();
      const base = resolveUrl('/api/realtime/stream');
      const sep = base.includes('?') ? '&' : '?';
      const streamUrl = `${base}${sep}token=${encodeURIComponent(this.currentToken)}&deviceId=${encodeURIComponent(deviceId)}&since=${this.lastSeq}`;

      const es = new EventSource(streamUrl);
      this.eventSource = es;

      es.addEventListener('connected', (evt: MessageEvent) => {
        try {
          const data = JSON.parse(evt.data);
          if (typeof data.seq === 'number') this.lastSeq = Math.max(this.lastSeq, data.seq);
          if (typeof data.dbVersion === 'number') {
            if (this.lastDbVersion > 0 && data.dbVersion > this.lastDbVersion) {
              this.emitSyncBroadcast('system', 'updated');
            }
            this.lastDbVersion = Math.max(this.lastDbVersion, data.dbVersion);
          }
        } catch (_) {}
      });

      const handleEvent = (evt: MessageEvent) => {
        try {
          const ev: RealtimeEvent = JSON.parse(evt.data);
          this.processEvent(ev);
        } catch (_) {}
      };

      es.addEventListener('sync_update', handleEvent);
      es.addEventListener('admin_notification', handleEvent);
      es.addEventListener('session_revoked', handleEvent);

      es.addEventListener('heartbeat', (evt: MessageEvent) => {
        try {
          const data = JSON.parse(evt.data);
          if (typeof data.dbVersion === 'number' && this.lastDbVersion > 0 && data.dbVersion > this.lastDbVersion) {
            this.lastDbVersion = data.dbVersion;
            this.emitSyncBroadcast('system', 'updated');
          }
        } catch (_) {}
      });

      es.onerror = () => {
        // Browser EventSource retries automatically; fallback poll fills gap
      };
    } catch (_) {}
  }

  private setupFallbackPoll() {
    if (typeof window === 'undefined') return;
    this.pollTimer = setInterval(async () => {
      if (!this.isStarted || this.isPolling) return;
      const token = this.currentToken || getStoredToken();
      if (!token) return;
      // Poll faster if SSE isn't actively OPEN, and periodically even if OPEN (for Vercel multi-instance DB changes)
      const sseOpen = this.eventSource && this.eventSource.readyState === EventSource.OPEN;
      this.isPolling = true;
      try {
        const deviceId = getClientDeviceId();
        const sessionId = getClientSessionId();
        const url = resolveUrl(`/api/realtime/events?since=${this.lastSeq}`);
        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
          'X-Device-Id': deviceId,
        };
        if (sessionId) headers['X-Session-Id'] = sessionId;

        const res = await fetch(url, { headers, cache: 'no-store' });
        if (res.status === 401 || res.status === 403) {
          const errBody = await res.json().catch(() => ({}));
          if (errBody?.code === 'SESSION_REVOKED' || errBody?.code === 'ACCOUNT_DISABLED' || errBody?.code === 'INVALID_TOKEN') {
            window.dispatchEvent(
              new CustomEvent('tamvesta_session_revoked', {
                detail: { reason: errBody.error || 'Sesi akun Anda telah berakhir atau dicabut.' },
              })
            );
            this.stop();
          }
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.events)) {
          data.events.forEach((ev: RealtimeEvent) => this.processEvent(ev));
        }
        if (typeof data.seq === 'number') this.lastSeq = Math.max(this.lastSeq, data.seq);
        if (typeof data.dbVersion === 'number') {
          if (this.lastDbVersion > 0 && data.dbVersion > this.lastDbVersion && (!data.events || data.events.length === 0)) {
            this.emitSyncBroadcast('system', 'updated');
          }
          this.lastDbVersion = Math.max(this.lastDbVersion, data.dbVersion);
        }
        if (sseOpen) {
          // keep light
        }
      } catch (_) {
      } finally {
        this.isPolling = false;
      }
    }, 3500);
  }

  private emitSyncBroadcast(entity: RealtimeEvent['entity'], action: RealtimeEvent['action'], entityId?: string) {
    window.dispatchEvent(
      new CustomEvent('tamvesta_realtime_sync', {
        detail: {
          id: `sync_${Date.now()}`,
          seq: this.lastSeq,
          type: 'sync_update',
          entity,
          action,
          entityId,
          createdAt: new Date().toISOString(),
        },
      })
    );
  }

  private processEvent(ev: RealtimeEvent) {
    if (!ev || !ev.id) return;
    if (this.seenEventIds.has(ev.id)) return;
    this.seenEventIds.add(ev.id);
    if (this.seenEventIds.size > 400) {
      const arr = Array.from(this.seenEventIds).slice(-250);
      this.seenEventIds = new Set(arr);
    }

    if (typeof ev.seq === 'number') {
      this.lastSeq = Math.max(this.lastSeq, ev.seq);
    }

    if (ev.type === 'session_revoked') {
      if (!ev.targetUserId || ev.targetUserId === this.currentUser?.id) {
        window.dispatchEvent(
          new CustomEvent('tamvesta_session_revoked', {
            detail: ev.payload || { reason: 'Sesi atau akun Anda telah dinonaktifkan / dihapus oleh Administrator.' },
          })
        );
        this.stop();
      }
      return;
    }

    if (ev.type === 'admin_notification') {
      // Strictly ONLY Admin role receives Admin Dashboard notifications!
      if (this.currentUser?.role !== 'admin') return;
      const myDeviceId = getClientDeviceId();
      if (ev.excludeDeviceId && ev.excludeDeviceId === myDeviceId) return;

      const notif: AppNotification | undefined = ev.notification;
      if (!notif) return;
      const dedupeKey = notif.dedupeKey || notif.id;
      if (this.seenAdminDedupeKeys.has(dedupeKey)) return;
      this.seenAdminDedupeKeys.add(dedupeKey);
      if (this.seenAdminDedupeKeys.size > 300) {
        this.seenAdminDedupeKeys = new Set(Array.from(this.seenAdminDedupeKeys).slice(-150));
      }

      window.dispatchEvent(new CustomEvent('tamvesta_admin_notification', { detail: notif }));
      window.dispatchEvent(new CustomEvent('tamvesta_refresh_notifications'));
      this.emitSyncBroadcast('users', 'updated', ev.entityId);
      return;
    }

    if (ev.type === 'sync_update') {
      if (ev.payload?.dbVersion) {
        this.lastDbVersion = Math.max(this.lastDbVersion, Number(ev.payload.dbVersion));
      }
      window.dispatchEvent(new CustomEvent('tamvesta_realtime_sync', { detail: ev }));
      if (ev.entity === 'notifications' || ev.entity === 'announcements' || ev.entity === 'posts') {
        window.dispatchEvent(new CustomEvent('tamvesta_refresh_notifications'));
      }
    }
  }
}

export const realtimeSync = new RealtimeSyncManager();
