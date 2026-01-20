import { getConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { NORDVPN_SERVERS, SOCKS5_PORT, type NordVPNServer } from './servers.js';

interface ProxyState {
  server: NordVPNServer;
  failureCount: number;
  lastUsed: Date;
}

export class ProxyManager {
  private servers: ProxyState[];
  private currentIndex: number = 0;
  private maxFailures: number = 3;
  private countryFilter: string | null = null;

  constructor(countryCode?: string) {
    this.countryFilter = countryCode?.toUpperCase() || null;
    const filtered = this.countryFilter 
      ? NORDVPN_SERVERS.filter(s => s.countryCode === this.countryFilter)
      : NORDVPN_SERVERS;
    
    this.servers = filtered.map(server => ({
      server,
      failureCount: 0,
      lastUsed: new Date(0),
    }));

    if (this.servers.length === 0) {
      throw new Error(`No servers available for country: ${countryCode}`);
    }

    log.info(`ProxyManager initialized with ${this.servers.length} servers`);
  }

  getProxyUrl(): string {
    const config = getConfig();
    const state = this.servers[this.currentIndex];
    state.lastUsed = new Date();
    
    return `socks5://${config.NORDVPN_USERNAME}:${config.NORDVPN_PASSWORD}@${state.server.hostname}:${SOCKS5_PORT}`;
  }

  getCurrentServer(): NordVPNServer {
    return this.servers[this.currentIndex].server;
  }

  rotate(): NordVPNServer {
    const availableServers = this.servers.filter(s => s.failureCount < this.maxFailures);
    
    if (availableServers.length === 0) {
      log.warn('All servers have exceeded failure threshold, resetting counts');
      this.servers.forEach(s => s.failureCount = 0);
    }

    this.currentIndex = (this.currentIndex + 1) % this.servers.length;
    
    while (this.servers[this.currentIndex].failureCount >= this.maxFailures) {
      this.currentIndex = (this.currentIndex + 1) % this.servers.length;
    }

    const server = this.servers[this.currentIndex].server;
    log.debug(`Rotated to proxy: ${server.hostname} (${server.country})`);
    return server;
  }

  reportFailure(): void {
    const state = this.servers[this.currentIndex];
    state.failureCount++;
    log.warn(`Proxy failure reported for ${state.server.hostname}, count: ${state.failureCount}`);
    
    if (state.failureCount >= this.maxFailures) {
      log.warn(`Server ${state.server.hostname} exceeded failure threshold, will skip`);
    }
  }

  reportSuccess(): void {
    const state = this.servers[this.currentIndex];
    if (state.failureCount > 0) {
      state.failureCount = Math.max(0, state.failureCount - 1);
    }
  }

  getStats(): { total: number; healthy: number; failed: number } {
    const healthy = this.servers.filter(s => s.failureCount < this.maxFailures).length;
    return {
      total: this.servers.length,
      healthy,
      failed: this.servers.length - healthy,
    };
  }
}
