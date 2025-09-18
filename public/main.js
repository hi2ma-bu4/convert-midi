import { audioToMidi, midiToJson } from "../dist/index.js";

const fileInput = document.getElementById("file-input");
const convertBtn = document.getElementById("convert-btn");
const statusEl = document.getElementById("status");
const downloadLink = document.getElementById("download-link");
const jsonOutput = document.getElementById("json-output");

let audioFile = null;

fileInput.addEventListener("change", (event) => {
	audioFile = event.target.files[0];
	statusEl.textContent = "";
	downloadLink.style.display = "none";
	jsonOutput.style.display = "none";
});

convertBtn.addEventListener("click", async () => {
	if (!audioFile) {
		statusEl.textContent = "Please select a .wav file first.";
		return;
	}

	statusEl.textContent = "Converting...";
	downloadLink.style.display = "none";
	jsonOutput.style.display = "none";

	try {
		const arrayBuffer = await audioFile.arrayBuffer();
		const midiData = await audioToMidi(arrayBuffer);

		if (midiData.length === 0) {
			statusEl.textContent = "No notes could be detected in the audio.";
			return;
		}

		// Create a Blob from the MIDI data
		const blob = new Blob([midiData], { type: "audio/midi" });
		const url = URL.createObjectURL(blob);

		// Set up the download link
		downloadLink.href = url;
		downloadLink.style.display = "block";

		// Display the JSON representation of the MIDI
		const midiJson = midiToJson(midiData);
		jsonOutput.textContent = JSON.stringify(midiJson, null, 2);
		jsonOutput.style.display = "block";

		statusEl.textContent = "Conversion successful!";
	} catch (error) {
		console.error(error);
		statusEl.textContent = `An error occurred: ${error.message}`;
	}
});
