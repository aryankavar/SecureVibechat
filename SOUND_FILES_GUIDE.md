# 🔊 Sound Files Setup Guide

## 📁 Required Directory Structure

```
public/
└── sounds/
    ├── message-sent.mp3
    ├── message-received.mp3
    ├── friend-request.mp3
    ├── request-accepted.mp3
    ├── message-read.mp3
    └── notification.mp3
```

---

## 🎵 Sound Requirements

### Technical Specifications

| Property | Requirement |
|----------|-------------|
| Format | MP3 or OGG |
| Duration | 0.3 - 1.0 seconds |
| Bitrate | 128kbps minimum |
| Sample Rate | 44.1kHz |
| Channels | Mono or Stereo |
| File Size | < 50KB each |

### Sound Characteristics

- **Gentle and pleasant** tones
- **Not jarring** or loud
- **Clear and distinct** from each other
- **Normalized volume** across all files
- **No silence** at start/end

---

## 🎨 Sound Design Guidelines

### 1. Message Sent
- **Character**: Soft, satisfying "pop" or "whoosh"
- **Feeling**: Confirmation, success
- **Example**: Bubble pop, soft click
- **Duration**: 0.3-0.5s

### 2. Message Received
- **Character**: Gentle chime or bell
- **Feeling**: Friendly notification
- **Example**: Soft ding, pleasant tone
- **Duration**: 0.4-0.6s

### 3. Friend Request
- **Character**: Uplifting notification
- **Feeling**: Excitement, invitation
- **Example**: Ascending chime, sparkle
- **Duration**: 0.5-0.8s

### 4. Request Accepted
- **Character**: Success celebration
- **Feeling**: Joy, connection
- **Example**: Success chime, happy tone
- **Duration**: 0.6-1.0s

### 5. Message Read
- **Character**: Subtle acknowledgment
- **Feeling**: Quiet confirmation
- **Example**: Soft tick, gentle beep
- **Duration**: 0.2-0.4s

### 6. Notification
- **Character**: General alert
- **Feeling**: Attention-grabbing but pleasant
- **Example**: Notification bell, alert tone
- **Duration**: 0.4-0.6s

---

## 📥 Where to Get Sounds

### Free Sound Libraries

#### 1. Freesound.org
- **URL**: https://freesound.org/
- **License**: Creative Commons
- **Quality**: High
- **Search terms**: "notification", "pop", "chime", "bell"

#### 2. Zapsplat.com
- **URL**: https://www.zapsplat.com/
- **License**: Free with attribution
- **Quality**: Professional
- **Category**: UI Sounds → Notifications

#### 3. Mixkit.co
- **URL**: https://mixkit.co/free-sound-effects/
- **License**: Free for commercial use
- **Quality**: High
- **Category**: Notification Sounds

#### 4. Pixabay
- **URL**: https://pixabay.com/sound-effects/
- **License**: Free for commercial use
- **Quality**: Good
- **Search**: "notification sound", "message tone"

#### 5. Soundbible.com
- **URL**: http://soundbible.com/
- **License**: Various (check each)
- **Quality**: Mixed
- **Category**: Interface Sounds

---

## 🛠️ Creating Custom Sounds

### Using Audacity (Free)

1. **Download Audacity**: https://www.audacityteam.org/

2. **Generate Tone**:
   - Generate → Tone
   - Waveform: Sine or Triangle
   - Frequency: 800-1200 Hz
   - Duration: 0.3-0.5s

3. **Add Envelope**:
   - Effect → Fade In (0.05s)
   - Effect → Fade Out (0.1s)

4. **Normalize**:
   - Effect → Normalize
   - Set to -3dB

5. **Export**:
   - File → Export → Export as MP3
   - Quality: 128kbps

### Using GarageBand (Mac)

1. **Create New Project**
2. **Add Software Instrument**
3. **Choose Synth Sound**
4. **Record Short Note**
5. **Add Effects** (reverb, delay)
6. **Export as MP3**

### Using Online Tools

#### Bfxr (Browser-based)
- **URL**: https://www.bfxr.net/
- **Type**: Retro sound generator
- **Use**: Generate 8-bit style sounds
- **Export**: WAV (convert to MP3)

#### ChipTone
- **URL**: https://sfbgames.itch.io/chiptone
- **Type**: Chiptune sound maker
- **Use**: Create retro game sounds
- **Export**: WAV

---

## 🎯 Recommended Sound Packs

### Option 1: iOS-Style Sounds
- Clean, minimal tones
- Professional quality
- Familiar to users
- Search: "iOS notification sounds"

### Option 2: Material Design Sounds
- Google's design language
- Modern and pleasant
- Well-tested UX
- Search: "Material Design sounds"

### Option 3: Custom Pastel Theme
- Soft, dreamy tones
- Match your aesthetic
- Unique to your app
- Create with synthesizers

---

## 📝 Sound File Checklist

Before adding sounds to your app:

- [ ] All 6 sound files created
- [ ] Files are in MP3 format
- [ ] Duration < 1 second each
- [ ] Volume normalized
- [ ] No silence at start/end
- [ ] File size < 50KB each
- [ ] Tested in browser
- [ ] Sounds are distinct
- [ ] Pleasant and not jarring
- [ ] License allows commercial use

---

## 🔧 Installation Steps

### Step 1: Create Directory

```bash
mkdir -p public/sounds
```

### Step 2: Add Sound Files

Place your 6 sound files in `public/sounds/`:

```bash
public/sounds/
├── message-sent.mp3
├── message-received.mp3
├── friend-request.mp3
├── request-accepted.mp3
├── message-read.mp3
└── notification.mp3
```

### Step 3: Verify Files

```bash
ls -lh public/sounds/
```

Should show all 6 files with sizes < 50KB each.

### Step 4: Test in Browser

Open browser console and test:

```javascript
const audio = new Audio('/sounds/notification.mp3')
audio.play()
```

---

## 🎨 Sound Conversion

### Convert WAV to MP3

#### Using FFmpeg (Command Line)

```bash
# Install FFmpeg
brew install ffmpeg  # Mac
sudo apt install ffmpeg  # Linux

# Convert single file
ffmpeg -i input.wav -b:a 128k output.mp3

# Convert all WAV files
for file in *.wav; do
  ffmpeg -i "$file" -b:a 128k "${file%.wav}.mp3"
done
```

#### Using Online Converter

1. Go to https://cloudconvert.com/wav-to-mp3
2. Upload WAV file
3. Set quality to 128kbps
4. Convert and download

### Normalize Volume

```bash
# Using FFmpeg
ffmpeg -i input.mp3 -af "volume=0.5" output.mp3

# Or normalize to -3dB
ffmpeg -i input.mp3 -af "loudnorm" output.mp3
```

---

## 🧪 Testing Sounds

### Browser Test

```javascript
// Test all sounds
const sounds = [
  'message-sent',
  'message-received',
  'friend-request',
  'request-accepted',
  'message-read',
  'notification'
]

sounds.forEach(sound => {
  const audio = new Audio(`/sounds/${sound}.mp3`)
  audio.play()
    .then(() => console.log(`✅ ${sound} works`))
    .catch(err => console.error(`❌ ${sound} failed:`, err))
})
```

### Volume Test

```javascript
// Test at different volumes
const audio = new Audio('/sounds/notification.mp3')
audio.volume = 0.5  // 50%
audio.play()
```

### Mobile Test

1. Open app on mobile device
2. Go to Settings
3. Enable sounds
4. Click "Test" button
5. Verify sound plays

---

## 🎵 Example Sound Descriptions

### Message Sent
```
Frequency: 1000Hz
Duration: 0.3s
Envelope: Quick attack, medium decay
Character: Satisfying "pop"
```

### Message Received
```
Frequency: 800Hz
Duration: 0.5s
Envelope: Soft attack, long decay
Character: Gentle "ding"
```

### Friend Request
```
Frequency: 1200Hz → 1500Hz (ascending)
Duration: 0.7s
Envelope: Medium attack, long decay
Character: Uplifting chime
```

### Request Accepted
```
Frequency: 1000Hz → 1200Hz → 1500Hz (chord)
Duration: 0.8s
Envelope: Quick attack, long decay
Character: Success celebration
```

### Message Read
```
Frequency: 900Hz
Duration: 0.2s
Envelope: Very quick attack and decay
Character: Subtle tick
```

### Notification
```
Frequency: 1100Hz
Duration: 0.5s
Envelope: Medium attack, medium decay
Character: Alert bell
```

---

## 📄 License Considerations

### Creative Commons Licenses

- **CC0**: Public domain, use freely
- **CC BY**: Attribution required
- **CC BY-SA**: Attribution + share-alike
- **CC BY-NC**: Non-commercial only

### Best Practices

1. **Keep attribution** in a credits file
2. **Check license** before using
3. **Prefer CC0 or CC BY** for commercial use
4. **Document sources** for each sound

### Attribution Example

Create `public/sounds/CREDITS.txt`:

```
Sound Credits:

message-sent.mp3
- Source: Freesound.org
- Author: username
- License: CC BY 3.0
- URL: https://freesound.org/...

message-received.mp3
- Source: Zapsplat.com
- Author: Zapsplat
- License: Free with attribution
- URL: https://www.zapsplat.com/...
```

---

## 🚀 Quick Start (No Custom Sounds)

If you want to skip custom sounds initially:

### Option 1: Use Data URIs

Create silent/minimal sounds in code:

```javascript
// In soundManager.js
const silentSound = 'data:audio/mp3;base64,//uQx...'
```

### Option 2: Disable Sounds

Set default to disabled:

```javascript
// In soundManager.js
this.enabled = false  // Default off
```

### Option 3: Use Browser Beep

```javascript
// Simple beep fallback
const beep = () => {
  const context = new AudioContext()
  const oscillator = context.createOscillator()
  oscillator.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + 0.1)
}
```

---

## ✅ Final Checklist

Before deploying:

- [ ] All sound files in `public/sounds/`
- [ ] Files are MP3 format
- [ ] Total size < 300KB
- [ ] Tested in Chrome
- [ ] Tested in Firefox
- [ ] Tested in Safari
- [ ] Tested on mobile
- [ ] Volume is appropriate
- [ ] Sounds are pleasant
- [ ] License allows use
- [ ] Attribution documented (if required)

---

**🎵 Your sound system is ready! 🔊**

**Next**: Test sounds in Settings → Sound → Test button
