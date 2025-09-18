import * as _tonejs_midi from '@tonejs/midi';

/**
 * Converts audio data from a WAV file into MIDI data.
 * This function works in both Node.js (with a Buffer) and modern browsers (with an ArrayBuffer).
 *
 * @param audioData The audio data to convert, as a Buffer (Node.js) or ArrayBuffer (Browser).
 * @returns A promise that resolves to a Uint8Array containing the MIDI file data.
 */
declare function audioToMidi(audioData: Buffer | ArrayBuffer): Promise<Uint8Array>;
/**
 * Auxiliary function to get MIDI data as a JSON object for inspection.
 * @param midiData The MIDI data as a Uint8Array.
 * @returns A JSON representation of the MIDI data, or null if invalid.
 */
declare function midiToJson(midiData: Uint8Array): _tonejs_midi.MidiJSON | null;

export { audioToMidi, midiToJson };
