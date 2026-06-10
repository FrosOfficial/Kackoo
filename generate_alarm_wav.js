const fs = require('fs');
const path = require('path');

function writeWavHeader(buffer, numSamples, sampleRate) {
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
}

function generateAlarmWav(filePath) {
  const sampleRate = 8000;
  const durationSeconds = 3;
  const numSamples = sampleRate * durationSeconds;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  
  writeWavHeader(buffer, numSamples, sampleRate);
  
  const frequency = 1000;
  const pulseDuration = 0.25;
  
  for (let i = 0; i < numSamples; i++) {
    const time = i / sampleRate;
    const isPulseOn = Math.floor(time / pulseDuration) % 2 === 0;
    
    let sample = 0;
    if (isPulseOn) {
      const cycle = Math.sin(2 * Math.PI * frequency * time);
      sample = cycle >= 0 ? 28000 : -28000; // Pulsing square wave
    }
    
    buffer.writeInt16LE(sample, 44 + i * 2);
  }
  
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  console.log('Generated alarm.wav');
}

function generateChimeWav(filePath) {
  const sampleRate = 8000;
  const durationSeconds = 3;
  const numSamples = sampleRate * durationSeconds;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  
  writeWavHeader(buffer, numSamples, sampleRate);
  
  const frequency = 523.25; // C5
  const decayConstant = 2.0; // Decay rate
  
  for (let i = 0; i < numSamples; i++) {
    const time = i / sampleRate;
    // Repeat every 1.5 seconds
    const localTime = time % 1.5;
    
    // Sine wave with exponential decay
    const cycle = Math.sin(2 * Math.PI * frequency * localTime);
    const amplitude = Math.exp(-decayConstant * localTime);
    const sample = Math.round(cycle * amplitude * 24000);
    
    buffer.writeInt16LE(sample, 44 + i * 2);
  }
  
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  console.log('Generated chime.wav');
}

function generateBeepWav(filePath) {
  const sampleRate = 8000;
  const durationSeconds = 3;
  const numSamples = sampleRate * durationSeconds;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  
  writeWavHeader(buffer, numSamples, sampleRate);
  
  const frequency = 880; // A5
  
  for (let i = 0; i < numSamples; i++) {
    const time = i / sampleRate;
    const localTime = time % 1.0; // Repeat every 1.0s
    
    let sample = 0;
    // Double beep: first beep (0.0s to 0.1s), second beep (0.15s to 0.25s)
    const isBeep1 = localTime >= 0.0 && localTime < 0.1;
    const isBeep2 = localTime >= 0.15 && localTime < 0.25;
    
    if (isBeep1 || isBeep2) {
      const cycle = Math.sin(2 * Math.PI * frequency * time);
      sample = cycle >= 0 ? 25000 : -25000; // Square wave double beep
    }
    
    buffer.writeInt16LE(sample, 44 + i * 2);
  }
  
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  console.log('Generated beep.wav');
}

const assetsDir = path.join(__dirname, 'assets');
generateAlarmWav(path.join(assetsDir, 'alarm.wav'));
generateChimeWav(path.join(assetsDir, 'chime.wav'));
generateBeepWav(path.join(assetsDir, 'beep.wav'));
