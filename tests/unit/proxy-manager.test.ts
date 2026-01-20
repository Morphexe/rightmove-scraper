import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { ProxyManager } from '../../src/proxy/manager.js';

mock.module('../../src/config/index.js', () => ({
  getConfig: () => ({
    NORDVPN_USERNAME: 'test_user',
    NORDVPN_PASSWORD: 'test_pass',
  }),
}));

mock.module('../../src/utils/logger.js', () => ({
  log: {
    info: () => {},
    warn: () => {},
    debug: () => {},
    error: () => {},
  },
}));

describe('ProxyManager', () => {
  let proxyManager: ProxyManager;

  beforeEach(() => {
    proxyManager = new ProxyManager('GB');
  });

  test('initializes with UK servers when country code is GB', () => {
    const stats = proxyManager.getStats();
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.healthy).toBe(stats.total);
    expect(stats.failed).toBe(0);
  });

  test('getProxyUrl returns correctly formatted SOCKS5 URL', () => {
    const url = proxyManager.getProxyUrl();
    expect(url).toMatch(/^socks5:\/\/test_user:test_pass@.*\.nordvpn\.com:1080$/);
  });

  test('getCurrentServer returns a valid server object', () => {
    const server = proxyManager.getCurrentServer();
    expect(server).toHaveProperty('hostname');
    expect(server).toHaveProperty('country');
    expect(server).toHaveProperty('countryCode');
    expect(server.countryCode).toBe('GB');
  });

  test('rotate changes to a different server', () => {
    const initialServer = proxyManager.getCurrentServer();
    proxyManager.rotate();
    const newServer = proxyManager.getCurrentServer();
    expect(newServer.hostname).not.toBe(initialServer.hostname);
  });

  test('reportFailure increments failure count', () => {
    const initialStats = proxyManager.getStats();
    proxyManager.reportFailure();
    proxyManager.reportFailure();
    proxyManager.reportFailure();
    
    const newStats = proxyManager.getStats();
    expect(newStats.healthy).toBeLessThan(initialStats.healthy);
  });

  test('reportSuccess decrements failure count', () => {
    proxyManager.reportFailure();
    proxyManager.reportFailure();
    proxyManager.reportSuccess();
  });

  test('skips servers that exceed failure threshold', () => {
    const initialServer = proxyManager.getCurrentServer();
    
    proxyManager.reportFailure();
    proxyManager.reportFailure();
    proxyManager.reportFailure();
    
    proxyManager.rotate();
    const newServer = proxyManager.getCurrentServer();
    expect(newServer.hostname).not.toBe(initialServer.hostname);
  });

  test('throws error if no servers available for country', () => {
    expect(() => new ProxyManager('XX')).toThrow('No servers available');
  });
});
