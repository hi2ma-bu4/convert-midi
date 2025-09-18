import { describe, it, expect } from 'vitest';
import { audioToMidi, midiToJson } from '../src/index';
import { WaveFile } from 'wavefile';

/**
 * Generates a WAV file buffer containing a sine wave.
 * @param freq Frequency of the sine wave in Hz.
 * @param duration Duration in seconds.
 * @param sampleRate Sample rate.
 * @returns A Buffer containing the WAV file data.
 */
function generateSineWav(freq = 440, duration = 1, sampleRate = 44100): Buffer {
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    samples[i] = Math.sin(2 * Math.PI * freq * (i / sampleRate));
  }

  const wav = new WaveFile();
  // Using '32f' for 32-bit floating point PCM, which our decoder expects
  wav.fromScratch(1, sampleRate, '32f', samples);
  return wav.toBuffer();
}

describe('audioToMidi Converter', () => {
  it('should convert a simple sine wave (440Hz) to the correct MIDI note (A4 / 69)', async () => {
    // 1. Generate a test WAV file
    const wavBuffer = generateSineWav(440, 1);

    // 2. Convert audio to MIDI
    const midiData = await audioToMidi(wavBuffer);
    expect(midiData).toBeInstanceOf(Uint8Array);
    expect(midiData.length).toBeGreaterThan(0);

    // 3. Parse the MIDI data for verification
    const midiJson = midiToJson(midiData);
    expect(midiJson).not.toBeNull();

    // 4. Assert the contents of the MIDI
    const notes = midiJson?.tracks[0]?.notes;
    expect(notes).toBeDefined();
    expect(notes.length).toBeGreaterThan(0);

    // Check if the most common note is 69 (A4)
    const noteCounts: { [key: number]: number } = {};
    notes.forEach(note => {
      noteCounts[note.midi] = (noteCounts[note.midi] || 0) + 1;
    });

    const mostCommonNote = Object.keys(noteCounts).reduce((a, b) => noteCounts[a] > noteCounts[b] ? a : b);

    expect(parseInt(mostCommonNote, 10)).toBe(69);
  });

  it('should return an empty MIDI for silent audio', async () => {
    // Generate a truly silent WAV file by providing a buffer of zeros.
    const sampleRate = 44100;
    const duration = 1;
    const silentSamples = new Float32Array(sampleRate * duration);
    const wav = new WaveFile();
    wav.fromScratch(1, sampleRate, '32f', silentSamples);
    const silentWav = wav.toBuffer();

    const midiData = await audioToMidi(silentWav);
    expect(midiData).toBeInstanceOf(Uint8Array);

    const midiJson = midiToJson(midiData);
    // With 0 notes, toJSON() might be different depending on library
    // A 0 length array is a good sign, or a json representation with no notes
    if(midiData.length > 0) {
        const notes = midiJson?.tracks[0]?.notes;
        expect(notes.length).toBe(0);
    } else {
        expect(midiData.length).toBe(0);
    }
  });
});
