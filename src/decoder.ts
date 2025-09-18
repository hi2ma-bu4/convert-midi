import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { Readable } from "stream";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

export interface DecodedAudioData {
	sampleRate: number;
	channelData: Float32Array[];
}

// This function will handle decoding for both Node.js (Buffer) and Browser (ArrayBuffer)
export async function decodeAudio(
	audioData: Buffer | ArrayBuffer,
	fileType?: string,
): Promise<DecodedAudioData> {
	// Node.js environment
	if (typeof window === "undefined") {
		if (!(audioData instanceof Buffer)) {
			throw new Error("In Node.js, input must be a Buffer.");
		}
		if (!fileType) {
			throw new Error(
				"In Node.js, fileType must be provided (e.g., 'wav', 'mp3', 'm4a').",
			);
		}

		const tempDir = os.tmpdir();
		const tempFileName = `audio-to-midi-${Date.now()}.${fileType}`;
		const tempFilePath = path.join(tempDir, tempFileName);

		await fs.writeFile(tempFilePath, audioData);

		return new Promise((resolve, reject) => {
			let sampleRate = 44100; // Default sample rate
			const pcmChunks: Buffer[] = [];

			const command = ffmpeg(tempFilePath)
				.setFfmpegPath(ffmpegStatic)
				.on("codecData", (data) => {
					const details = Array.isArray(data.audio_details)
						? data.audio_details
						: [data.audio_details];
					details.forEach((detail) => {
						if (typeof detail === "string") {
							const rateMatch = detail.match(/(\d+)\s*Hz/);
							if (rateMatch && rateMatch[1]) {
								sampleRate = parseInt(rateMatch[1], 10);
							}
						}
					});
				})
				.audioCodec("pcm_f32le")
				.toFormat("f32le")
				.audioChannels(1)
				.on("error", (err, stdout, stderr) => {
					fs.unlink(tempFilePath).finally(() => {
						console.error("ffmpeg stdout:", stdout);
						console.error("ffmpeg stderr:", stderr);
						reject(new Error(`ffmpeg error: ${err.message}`));
					});
				})
				.on("end", () => {
					fs.unlink(tempFilePath).finally(() => {
						const pcmBuffer = Buffer.concat(pcmChunks);
						const float32Data = new Float32Array(
							pcmBuffer.buffer,
							pcmBuffer.byteOffset,
							pcmBuffer.length / Float32Array.BYTES_PER_ELEMENT,
						);
						resolve({
							sampleRate,
							channelData: [float32Data],
						});
					});
				});

			const outputStream = command.pipe();
			outputStream.on("data", (chunk: Buffer) => {
				pcmChunks.push(chunk);
			});
		});
	}
	// Browser environment
	else {
		if (!(audioData instanceof ArrayBuffer)) {
			return Promise.reject(
				new Error("In the browser, input must be an ArrayBuffer."),
			);
		}
		const audioContext = new (window.AudioContext ||
			(window as any).webkitAudioContext)();
		return audioContext.decodeAudioData(audioData).then((audioBuffer) => {
			const channelData = [];
			const monoChannel = new Float32Array(audioBuffer.length);
			if (audioBuffer.numberOfChannels > 1) {
				const left = audioBuffer.getChannelData(0);
				const right = audioBuffer.getChannelData(1);
				for (let i = 0; i < audioBuffer.length; i++) {
					monoChannel[i] = (left[i] + right[i]) / 2;
				}
				channelData.push(monoChannel);
			} else {
				channelData.push(audioBuffer.getChannelData(0));
			}

			return {
				sampleRate: audioBuffer.sampleRate,
				channelData,
			};
		});
	}
}
