// src/index.ts
import { Midi } from "@tonejs/midi";
import { PitchDetector } from "pitchy";

// src/decoder.ts
import { decode } from "wav-decoder";
function decodeAudio(audioData) {
  if (typeof window === "undefined") {
    if (!(audioData instanceof Buffer)) {
      return Promise.reject(new Error("In Node.js, input must be a Buffer."));
    }
    try {
      const decoded = decode(audioData);
      return Promise.resolve({
        sampleRate: decoded.sampleRate,
        channelData: decoded.channelData
      });
    } catch (err) {
      return Promise.reject(err);
    }
  } else {
    if (!(audioData instanceof ArrayBuffer)) {
      return Promise.reject(new Error("In the browser, input must be an ArrayBuffer."));
    }
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    return audioContext.decodeAudioData(audioData).then((audioBuffer) => {
      const channelData = [];
      for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        channelData.push(audioBuffer.getChannelData(i));
      }
      return {
        sampleRate: audioBuffer.sampleRate,
        channelData
      };
    });
  }
}

// src/index.ts
function frequencyToMidi(freq) {
  return Math.round(69 + 12 * Math.log2(freq / 440));
}
function analyzePitch(pcmData, sampleRate) {
  const windowSize = 2048;
  const hopSize = 512;
  const clarityThreshold = 0.95;
  const detector = PitchDetector.forFloat32Array(windowSize);
  const notes = [];
  for (let i = 0; i + windowSize <= pcmData.length; i += hopSize) {
    const frame = pcmData.slice(i, i + windowSize);
    const [pitch, clarity] = detector.findPitch(frame, sampleRate);
    if (pitch > 0 && clarity > clarityThreshold) {
      const timeInSeconds = i / sampleRate;
      notes.push({ pitch: frequencyToMidi(pitch), time: timeInSeconds });
    }
  }
  return notes;
}
function createMidi(notes) {
  if (notes.length === 0) {
    return new Uint8Array();
  }
  const midi = new Midi();
  const track = midi.addTrack();
  let currentNote = { ...notes[0], duration: 0 };
  for (let i = 1; i < notes.length; i++) {
    const prev = notes[i - 1];
    const curr = notes[i];
    const duration = curr.time - prev.time;
    if (curr.pitch === currentNote.pitch) {
      currentNote.duration += duration;
    } else {
      track.addNote({
        midi: currentNote.pitch,
        time: currentNote.time,
        duration: Math.max(0.05, currentNote.duration),
        // Ensure a minimum duration
        velocity: 0.8
      });
      currentNote = { ...curr, duration };
    }
  }
  track.addNote({
    midi: currentNote.pitch,
    time: currentNote.time,
    duration: Math.max(0.05, currentNote.duration),
    velocity: 0.8
  });
  return midi.toArray();
}
async function audioToMidi(audioData) {
  const { sampleRate, channelData } = await decodeAudio(audioData);
  const pcmData = channelData[0];
  if (!pcmData) {
    throw new Error("Audio data is empty or invalid.");
  }
  const noteEvents = analyzePitch(pcmData, sampleRate);
  const midiData = createMidi(noteEvents);
  return midiData;
}
function midiToJson(midiData) {
  try {
    const midi = new Midi(midiData);
    return midi.toJSON();
  } catch (e) {
    return null;
  }
}
export {
  audioToMidi,
  midiToJson
};
