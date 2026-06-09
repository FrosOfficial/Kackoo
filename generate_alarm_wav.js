const fs = require('fs');
const path = require('path');

function generateBeepWav(filePath) {
  const sampleRate = 8000;
  const durationSeconds = 3;
  const numSamples = sampleRate * durationSeconds;
  
  // 16-bit mono PCM
  const buffer = Buffer.alloc(44 + numSamples * 2);
  
  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  
  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20);  // AudioFormat = PCM
  buffer.writeUInt16LE(1, 22);  // NumChannels = 1
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32);  // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample
  
  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  
  // Generate square wave tone pulsing at 1000 Hz
  const frequency = 1000;
  const pulseDuration = 0.25; // beep every 0.25s
  
  for (let i = 0; i < numSamples; i++) {
    const time = i / sampleRate;
    const isPulseOn = Math.floor(time / pulseDuration) % 2 === 0;
    
    let sample = 0;
    if (isPulseOn) {
      // Square wave
      const cycle = Math.sin(2 * Math.PI * frequency * time);
      sample = cycle >= 0 ? 28000 : -28000; // Very loud digital beep volume
    }
    
    buffer.writeInt16LE(sample, 44 + i * 2);
  }
  
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  console.log('Generated alarm sound WAV at', filePath);
}

generateBeepWav(path.join(__dirname, 'assets/alarm.wav'));
