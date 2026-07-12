import { afterEach, describe, expect, it, vi } from 'vitest';
import { isRealtimeSupported } from './realtime-browser-support';

describe('isRealtimeSupported', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is true when RTCPeerConnection and getUserMedia exist', () => {
    vi.stubGlobal('RTCPeerConnection', class {});
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => Promise.resolve() } });

    expect(isRealtimeSupported()).toBe(true);
  });

  it('is false when RTCPeerConnection is missing', () => {
    vi.stubGlobal('RTCPeerConnection', undefined);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => Promise.resolve() } });

    expect(isRealtimeSupported()).toBe(false);
  });

  it('is false when mediaDevices is absent', () => {
    vi.stubGlobal('RTCPeerConnection', class {});
    vi.stubGlobal('navigator', {});

    expect(isRealtimeSupported()).toBe(false);
  });

  it('is false when getUserMedia is not a function', () => {
    vi.stubGlobal('RTCPeerConnection', class {});
    vi.stubGlobal('navigator', { mediaDevices: {} });

    expect(isRealtimeSupported()).toBe(false);
  });
});
