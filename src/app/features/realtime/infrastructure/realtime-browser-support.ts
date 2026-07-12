/**
 * Feature-detects the browser APIs the WebRTC voice transport needs before the
 * Talk button offers to start a session. Without this gate, an
 * `realtimeEnabled` config on an unsupported browser renders a button that can
 * only fail at `getUserMedia`/`RTCPeerConnection` time.
 */
export function isRealtimeSupported(): boolean {
  return (
    typeof RTCPeerConnection !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}
