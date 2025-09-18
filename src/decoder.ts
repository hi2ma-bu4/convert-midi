import { decode } from 'wav-decoder';

export interface DecodedAudioData {
  sampleRate: number;
  channelData: Float32Array[];
}

// This function will handle decoding for both Node.js (Buffer) and Browser (ArrayBuffer)
export function decodeAudio(audioData: Buffer | ArrayBuffer): Promise<DecodedAudioData> {
  // Node.js environment
  if (typeof window === 'undefined') {
    if (!(audioData instanceof Buffer)) {
      return Promise.reject(new Error("In Node.js, input must be a Buffer."));
    }
    try {
      const decoded = decode(audioData);
      return Promise.resolve({
        sampleRate: decoded.sampleRate,
        channelData: decoded.channelData,
      });
    } catch (err) {
      return Promise.reject(err);
    }
  }
  // Browser environment
  else {
    if (!(audioData instanceof ArrayBuffer)) {
      return Promise.reject(new Error("In the browser, input must be an ArrayBuffer."));
    }
    // Using Web Audio API for browser. Note: `webkitAudioContext` is for older Safari versions.
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioContext.decodeAudioData(audioData).then(audioBuffer => {
      const channelData = [];
      for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        channelData.push(audioBuffer.getChannelData(i));
      }
      return {
        sampleRate: audioBuffer.sampleRate,
        channelData,
      };
    });
  }
}
