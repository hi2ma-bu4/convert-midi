import { decodeAudio } from './decoder';
import { PitchDetector } from 'pitchy';
import { Midi } from '@tonejs/midi';

/**
 * Converts a frequency in Hz to a MIDI note number.
 * @param freq The frequency in Hz.
 * @returns The corresponding MIDI note number.
 */
function frequencyToMidi(freq: number): number {
  return Math.round(69 + 12 * Math.log2(freq / 440.0));
}

/**
 * A simplified representation of a musical note.
 */
interface NoteEvent {
  pitch: number; // MIDI note number
  time: number;  // Time in seconds from the start of the audio
}

/**
 * Analyzes raw audio data and extracts a sequence of musical notes.
 * @param pcmData The raw audio data (PCM).
 * @param sampleRate The sample rate of the audio.
 * @returns An array of detected note events.
 */
function analyzePitch(pcmData: Float32Array, sampleRate: number): NoteEvent[] {
  // These parameters can be tuned for different audio sources.
  const windowSize = 2048; // Size of the analysis window (in samples)
  const hopSize = 512;    // How much the window slides for each analysis (in samples)
  const clarityThreshold = 0.95; // Minimum clarity to be considered a valid note

  const detector = PitchDetector.forFloat32Array(windowSize);
  const notes: NoteEvent[] = [];

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

/**
 * Converts a sequence of note events into a standard MIDI file format.
 * @param notes The sequence of notes to be converted.
 * @returns A Uint8Array containing the MIDI file data.
 */
function createMidi(notes: NoteEvent[]): Uint8Array {
  if (notes.length === 0) {
    return new Uint8Array(); // Return empty MIDI if no notes were found
  }

  const midi = new Midi();
  const track = midi.addTrack();

  // Consolidate consecutive notes of the same pitch
  let currentNote = { ...notes[0], duration: 0 };

  for (let i = 1; i < notes.length; i++) {
    const prev = notes[i - 1];
    const curr = notes[i];
    const duration = curr.time - prev.time;

    // If pitch is the same, extend duration. Otherwise, write previous note and start a new one.
    if (curr.pitch === currentNote.pitch) {
      currentNote.duration += duration;
    } else {
      track.addNote({
        midi: currentNote.pitch,
        time: currentNote.time,
        duration: Math.max(0.05, currentNote.duration), // Ensure a minimum duration
        velocity: 0.8
      });
      currentNote = { ...curr, duration: duration };
    }
  }

  // Add the last note
  track.addNote({
    midi: currentNote.pitch,
    time: currentNote.time,
    duration: Math.max(0.05, currentNote.duration),
    velocity: 0.8
  });

  return midi.toArray();
}


/**
 * Converts audio data from a WAV file into MIDI data.
 * This function works in both Node.js (with a Buffer) and modern browsers (with an ArrayBuffer).
 *
 * @param audioData The audio data to convert, as a Buffer (Node.js) or ArrayBuffer (Browser).
 * @returns A promise that resolves to a Uint8Array containing the MIDI file data.
 */
export async function audioToMidi(audioData: Buffer | ArrayBuffer): Promise<Uint8Array> {
  // 1. Decode the audio file into raw PCM data
  const { sampleRate, channelData } = await decodeAudio(audioData);

  // Use the first channel for analysis (convert to mono)
  const pcmData = channelData[0];
  if (!pcmData) {
    throw new Error("Audio data is empty or invalid.");
  }

  // 2. Analyze the PCM data to detect pitches and create note events
  const noteEvents = analyzePitch(pcmData, sampleRate);

  // 3. Convert the sequence of note events into a MIDI file
  const midiData = createMidi(noteEvents);

  return midiData;
}

/**
 * Auxiliary function to get MIDI data as a JSON object for inspection.
 * @param midiData The MIDI data as a Uint8Array.
 * @returns A JSON representation of the MIDI data, or null if invalid.
 */
export function midiToJson(midiData: Uint8Array) {
  try {
    const midi = new Midi(midiData);
    return midi.toJSON();
  } catch (e) {
    return null;
  }
}
