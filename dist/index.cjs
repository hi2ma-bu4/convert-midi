"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  audioToMidi: () => audioToMidi,
  midiToJson: () => midiToJson
});
module.exports = __toCommonJS(index_exports);
var import_midi = require("@tonejs/midi");
var import_pitchy = require("pitchy");

// src/decoder.ts
var import_wav_decoder = require("wav-decoder");
async function decodeAudio(audioData) {
  if (typeof window === "undefined") {
    if (!(audioData instanceof Buffer)) {
      throw new Error("In Node.js, input must be a Buffer.");
    }
    const decoded = await (0, import_wav_decoder.decode)(audioData);
    return {
      sampleRate: decoded.sampleRate,
      channelData: decoded.channelData
    };
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
  const detector = import_pitchy.PitchDetector.forFloat32Array(windowSize);
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
  const midi = new import_midi.Midi();
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
    const midi = new import_midi.Midi(midiData);
    return midi.toJSON();
  } catch (e) {
    return null;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  audioToMidi,
  midiToJson
});
