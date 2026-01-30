# 🎥 Video Interview System - Complete Guide

## Overview

PrepWiser now includes a **production-grade live video + audio interview system** that records real-time video responses during interviews. This system uses **WebRTC** for browser-based recording and integrates seamlessly with the existing dynamic interview engine.

### Key Features

- ✅ **Real WebRTC Recording**: Uses `MediaRecorder API` for in-browser video/audio capture
- ✅ **No Mock Data**: Captures actual camera and microphone input
- ✅ **Deterministic Evaluation**: Rule-based scoring (NOT AI-based)
- ✅ **Full Audit Trail**: All recordings stored with metadata
- ✅ **SDP Defendable**: Transparent, reproducible evaluation
- ✅ **Browser Compatible**: Works in Chrome, Edge, Firefox
- ✅ **Progress Tracking**: Real-time upload progress
- ✅ **HTTP Streaming**: Efficient video playback with seek support
- ✅ **Backward Compatible**: Text-only interviews still work

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  LiveInterview.jsx                                           │
│  ├─ useMediaRecorder Hook                                    │
│  │  ├─ getUserMedia() → Camera/Mic Access                   │
│  │  ├─ MediaRecorder → Record video/webm                    │
│  │  └─ stopRecording() → Blob with metadata                 │
│  │                                                            │
│  └─ Socket.IO Client                                         │
│     ├─ emit: start_interview                                 │
│     ├─ emit: submit_answer (with mediaId)                    │
│     ├─ receive: next_question                                │
│     └─ receive: interview_completed                          │
│                                                               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ XHR Upload (multipart/form-data)
                        │ Socket Events (answer submission)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND (Express)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  POST /api/media/upload                                      │
│  ├─ Multer Middleware (500MB limit)                         │
│  ├─ File Validation (video/webm, mp4, ogg)                  │
│  ├─ Save to: uploads/interviews/{sessionId}/                │
│  └─ Create Media document in MongoDB                        │
│                                                               │
│  Socket.IO Server (interviewSocket.js)                       │
│  ├─ on: submit_answer (with mediaId, duration, size)        │
│  └─ → ImprovedInterviewOrchestrator.processAnswer()         │
│     ├─ Evaluate answer (deterministic rules)                │
│     ├─ Store media reference in turn                        │
│     └─ Generate next question                               │
│                                                               │
│  GET /api/media/:id/stream                                   │
│  └─ HTTP Range Requests (206 Partial Content)               │
│     └─ Efficient video streaming with seek                  │
│                                                               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE (MongoDB)                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Media Collection                                            │
│  ├─ userId, sessionId, questionId                           │
│  ├─ filepath, size, duration, mimeType                      │
│  └─ metadata: { transcriptionStatus, ... }                  │
│                                                               │
│  ConversationalInterview Collection                          │
│  └─ turns[].media                                            │
│     ├─ mediaId → Reference to Media document                │
│     ├─ duration, size, type                                 │
│     └─ streamUrl                                             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Setup Instructions

### 1. Backend Setup

#### Install Dependencies

```bash
cd server
npm install multer
```

#### Create Upload Directories

```bash
mkdir -p uploads/interviews
```

#### Add to `.gitignore`

```gitignore
# Video uploads (large files, not for version control)
uploads/
```

#### Environment Variables (Optional)

```env
# .env (server)
MAX_VIDEO_SIZE=524288000  # 500MB in bytes
UPLOAD_DIR=uploads/interviews
```

### 2. Frontend Setup

No additional dependencies needed - uses built-in WebRTC APIs.

#### Import Component

```javascript
// client/src/App.jsx
import LiveInterview from './components/LiveInterview';

function App() {
  return (
    <Routes>
      <Route path="/interview/live" element={<LiveInterview />} />
    </Routes>
  );
}
```

---

## Usage Guide

### Starting a Video Interview

1. **Navigate to Interview Page**
   ```
   http://localhost:5173/interview/live
   ```

2. **Grant Permissions**
   - Browser will request camera and microphone access
   - Click "Allow" to enable recording

3. **Start Interview**
   - Click "Start Interview" button
   - System connects to backend via Socket.IO
   - First question appears

4. **Answer Questions**
   - Click "Start Recording" to begin
   - Answer the question on camera
   - Click "Submit Answer" when done
   - Video uploads automatically with progress bar

5. **Receive Evaluation**
   - System evaluates answer using deterministic rules
   - Displays scores for clarity, relevance, depth, structure
   - Shows next question

6. **Complete Interview**
   - Answer all questions
   - Receive final summary with overall scores
   - View strengths and improvement areas

---

## Browser Compatibility

### ✅ Supported Browsers

| Browser | Min Version | Notes |
|---------|-------------|-------|
| Chrome  | 49+         | Full support, recommended |
| Edge    | 79+         | Full support (Chromium) |
| Firefox | 29+         | Full support |
| Safari  | 14.1+       | Requires `video/mp4` codec |
| Opera   | 36+         | Full support |

### ⚠️ Codec Support

- **Primary**: `video/webm; codecs=vp8,opus` (Chrome, Edge, Firefox)
- **Fallback**: `video/mp4` (Safari)
- **Detection**: Automatic via `MediaRecorder.isTypeSupported()`

---

## Technical Specifications

### Video Recording

```javascript
// codec
mimeType: 'video/webm; codecs=vp8,opus'

// Constraints
video: {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 }
}

audio: {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
}

// Chunking
timeslice: 1000 // 1-second chunks for long recordings
```

### File Upload

```javascript
// Multer Configuration
destination: 'uploads/interviews/{sessionId}/'
filename: '{questionId}-{timestamp}-{hash}.webm'
maxFileSize: 500MB
allowedMimes: ['video/webm', 'video/mp4', 'video/ogg']
```

### Storage Structure

```
uploads/
└── interviews/
    └── {sessionId}/
        ├── q1-1234567890-abc123.webm
        ├── q2-1234567891-def456.webm
        └── q3-1234567892-ghi789.webm
```

### Database Schema

```javascript
// Media Collection
{
  _id: ObjectId,
  userId: ObjectId,
  sessionId: "interview_123",
  questionId: "q1",
  filename: "q1-1234567890-abc123.webm",
  filepath: "uploads/interviews/interview_123/q1-1234567890-abc123.webm",
  mimeType: "video/webm",
  size: 15728640,  // bytes
  duration: 120,    // seconds
  codec: "vp8,opus",
  uploadedAt: Date,
  metadata: {
    transcriptionStatus: "pending",
    transcriptionText: null
  }
}

// ConversationalInterview Collection - turns[] field
{
  turns: [{
    turnNumber: 1,
    question: { ... },
    answer: {
      text: "My answer...",
      timestamp: Date,
      timeSpent: 120,
      wordCount: 50
    },
    media: {
      mediaId: ObjectId,  // → References Media document
      duration: 120,
      size: 15728640,
      type: "video/webm",
      streamUrl: "/api/media/abc123/stream"
    },
    evaluation: { ... }
  }]
}
```

---

## API Reference

### Media Endpoints

#### Upload Video

```http
POST /api/media/upload
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body (FormData):
  video: File (Blob)
  sessionId: String (required)
  questionId: String (required)
  duration: Number (optional)
  size: Number (optional)
  mimeType: String (optional)
  timestamp: String (optional)

Response:
{
  success: true,
  mediaId: "64a1b2c3d4e5f6...",
  filename: "q1-1234567890-abc123.webm",
  size: 15728640,
  duration: 120
}

Errors:
400 - Missing required fields
401 - Unauthorized
413 - File too large (>500MB)
415 - Unsupported media type
```

#### Get Media Metadata

```http
GET /api/media/:id
Authorization: Bearer {token}

Response:
{
  id: "64a1b2c3d4e5f6...",
  sessionId: "interview_123",
  questionId: "q1",
  filename: "q1-1234567890-abc123.webm",
  size: 15728640,
  duration: 120,
  mimeType: "video/webm",
  streamUrl: "/api/media/64a1b2c3d4e5f6.../stream",
  uploadedAt: "2024-01-15T10:30:00Z"
}

Errors:
401 - Unauthorized
403 - Forbidden (not owner)
404 - Media not found
```

#### Stream Video

```http
GET /api/media/:id/stream
Authorization: Bearer {token}
Range: bytes=0-1048575 (optional)

Response:
206 Partial Content (if range provided)
200 OK (full file)

Headers:
  Content-Type: video/webm
  Content-Range: bytes 0-1048575/15728640
  Accept-Ranges: bytes

Errors:
401 - Unauthorized
403 - Forbidden
404 - Media not found
416 - Range not satisfiable
```

#### Delete Media

```http
DELETE /api/media/:id
Authorization: Bearer {token}

Response:
{
  success: true,
  message: "Media deleted successfully"
}

Errors:
401 - Unauthorized
403 - Forbidden
404 - Media not found
500 - File deletion failed
```

### Socket.IO Events

#### Client → Server

```javascript
// Start interview
socket.emit('start_interview', {
  userId: '64a1b2c3...',
  resumeData: { ... }
});

// Submit answer with video
socket.emit('submit_answer', {
  sessionId: 'interview_123',
  answer: 'My answer text...',
  timeSpent: 120,
  mediaId: '64a1b2c3...',      // NEW
  mediaDuration: 120,           // NEW
  mediaSize: 15728640          // NEW
});
```

#### Server → Client

```javascript
// Interview started
socket.on('interview_started', (data) => {
  // data.sessionId
  // data.question
});

// Next question
socket.on('next_question', (data) => {
  // data.question
  // data.turnNumber
});

// Interview completed
socket.on('interview_completed', (data) => {
  // data.summary
  // data.overallScore
  // data.strengths
  // data.improvements
});

// Error
socket.on('interview_error', (data) => {
  // data.error
  // data.code
});
```

---

## Troubleshooting

### Camera/Microphone Access Issues

#### Problem: "Permission denied"

**Solution:**
1. Check browser permissions settings
   - Chrome: `chrome://settings/content/camera`
   - Firefox: `about:preferences#privacy`
2. Ensure HTTPS connection (required for WebRTC)
3. Check system privacy settings (OS-level permissions)

#### Problem: "No camera found"

**Solution:**
1. Verify camera is connected
2. Check if camera is in use by another app
3. Restart browser
4. Try different browser

#### Problem: "Camera is already in use"

**Solution:**
1. Close other apps using camera (Zoom, Teams, etc.)
2. Close other browser tabs with camera access
3. Restart browser

### Upload Issues

#### Problem: "Upload failed"

**Solution:**
1. Check file size (must be <500MB)
2. Verify network connection
3. Check server logs for errors
4. Ensure `uploads/interviews/` directory exists
5. Verify disk space

#### Problem: "Upload progress stuck"

**Solution:**
1. Check network speed
2. Wait for larger files (can take several minutes)
3. Retry upload
4. Check server timeout settings

### Recording Issues

#### Problem: "Recording stops unexpectedly"

**Solution:**
1. Check browser console for errors
2. Verify MediaRecorder support
3. Update browser to latest version
4. Try smaller chunk size (reduce `timeslice`)

#### Problem: "No audio in recording"

**Solution:**
1. Check microphone permissions
2. Verify microphone is not muted
3. Test microphone in system settings
4. Check audio constraints in code

### Playback Issues

#### Problem: "Video won't play back"

**Solution:**
1. Check video codec compatibility
2. Verify file is not corrupted
3. Check browser console for errors
4. Try different browser

#### Problem: "Can't seek/scrub video"

**Solution:**
1. Verify server supports range requests
2. Check `Accept-Ranges: bytes` header
3. Ensure file is fully uploaded

---

## SDP Defense - Academic Integrity

### Why Video Recording?

**Purpose:** Simulate authentic interview conditions for realistic preparation

**NOT Used For:**
- ❌ AI-based scoring
- ❌ Facial expression analysis
- ❌ Emotion detection
- ❌ Biometric evaluation

**Used For:**
- ✅ Recording for user review
- ✅ Creating audit trail
- ✅ Enabling speech-to-text (future)
- ✅ Simulating real interview pressure

### Evaluation Transparency

#### Deterministic Rules (No AI in Scoring)

```javascript
// TRANSPARENT FORMULA (from evaluationService.js)

Clarity Score = 0.4 × (1 - fillerWordRatio) + 
                0.3 × grammarScore + 
                0.3 × structureScore

Relevance Score = 0.5 × keywordMatch + 
                  0.3 × topicAlignment + 
                  0.2 × focusScore

Depth Score = 0.4 × detailLevel + 
              0.3 × exampleQuality + 
              0.3 × insightDepth

Structure Score = 0.35 × organizationScore + 
                  0.35 × logicalFlow + 
                  0.30 × conclusionPresence
```

**Key Points:**
- All formulas are version-controlled
- Weights are documented and justified
- Results are reproducible (same input = same score)
- No black-box AI scoring

#### AI Usage (Limited to Content Generation)

**Where AI is Used:**
1. **Question Phrasing**: GPT generates natural-sounding questions
2. **Feedback Text**: GPT generates improvement suggestions
3. **Follow-up Questions**: GPT adapts based on answer content

**Where AI is NOT Used:**
1. ❌ Calculating scores
2. ❌ Determining pass/fail
3. ❌ Weighing metrics
4. ❌ Final evaluation

### Audit Trail

Every interview turn includes:

```javascript
{
  turnNumber: 1,
  question: { text, timestamp },
  answer: { text, timestamp, timeSpent, wordCount },
  media: { mediaId, duration, size, type },  // ← Video metadata
  evaluation: {
    clarity: { score, breakdown },
    relevance: { score, breakdown },
    depth: { score, breakdown },
    structure: { score, breakdown }
  },
  timestamp: Date
}
```

**Defensibility:**
- ✅ All inputs recorded (question, answer, time)
- ✅ All outputs recorded (scores, breakdowns)
- ✅ Media references preserved
- ✅ Evaluation rules versioned
- ✅ Reproducible from raw data

---

## Performance Optimization

### Video Compression (Future)

```javascript
// Optional: Compress before upload
import FFmpeg from '@ffmpeg/ffmpeg';

async function compressVideo(blob) {
  const ffmpeg = createFFmpeg({ log: true });
  await ffmpeg.load();
  
  ffmpeg.FS('writeFile', 'input.webm', await fetchFile(blob));
  await ffmpeg.run('-i', 'input.webm', '-c:v', 'libvpx', '-b:v', '1M', 'output.webm');
  
  const data = ffmpeg.FS('readFile', 'output.webm');
  return new Blob([data.buffer], { type: 'video/webm' });
}
```

### Cloud Storage Migration (Future)

```javascript
// Option: AWS S3 instead of local filesystem
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

async function uploadToS3(file, sessionId, questionId) {
  const key = `interviews/${sessionId}/${questionId}-${Date.now()}.webm`;
  
  await s3.send(new PutObjectCommand({
    Bucket: 'prepwiser-videos',
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype
  }));
  
  return { s3Key: key, url: `https://prepwiser-videos.s3.amazonaws.com/${key}` };
}
```

---

## Testing Checklist

### Manual Testing

- [ ] Camera permission request works
- [ ] Microphone permission request works
- [ ] Video preview shows before interview
- [ ] Recording starts successfully
- [ ] Recording timer updates every second
- [ ] Pause/resume recording works
- [ ] Video uploads with progress bar
- [ ] Upload completes successfully
- [ ] Media record created in MongoDB
- [ ] Socket emits submit_answer with mediaId
- [ ] Evaluation received and displayed
- [ ] Next question appears after evaluation
- [ ] Interview completes successfully
- [ ] Summary includes video metadata
- [ ] Video can be streamed back
- [ ] HTTP range requests work (seek/scrub)
- [ ] Error handling for denied permissions
- [ ] Error handling for failed uploads
- [ ] Reconnection works after disconnect

### Database Verification

```javascript
// MongoDB queries to verify data

// Check media records
db.media.find({ sessionId: "interview_123" });

// Check interview turns with media
db.conversationalinterviews.findOne(
  { _id: "interview_123" },
  { turns: 1 }
);

// Verify media references
db.conversationalinterviews.aggregate([
  { $unwind: "$turns" },
  { $match: { "turns.media.mediaId": { $exists: true } } },
  { $lookup: {
      from: "media",
      localField: "turns.media.mediaId",
      foreignField: "_id",
      as: "mediaDetails"
  }}
]);
```

---

## Future Enhancements

### 1. Speech-to-Text Transcription

```javascript
// Azure Speech Service integration
import { SpeechConfig, AudioConfig, SpeechRecognizer } from 'microsoft-cognitiveservices-speech-sdk';

async function transcribeVideo(mediaId) {
  const speechConfig = SpeechConfig.fromSubscription(key, region);
  const audioConfig = AudioConfig.fromWavFileInput(audioFile);
  const recognizer = new SpeechRecognizer(speechConfig, audioConfig);
  
  const result = await recognizer.recognizeOnceAsync();
  
  // Store in Media.metadata.transcriptionText
  await Media.findByIdAndUpdate(mediaId, {
    'metadata.transcriptionStatus': 'completed',
    'metadata.transcriptionText': result.text
  });
}
```

### 2. Video Analysis

```javascript
// Optional: Facial expression detection (NOT for scoring)
import * as faceapi from 'face-api.js';

async function analyzeVideo(mediaId) {
  const video = await loadVideo(mediaId);
  const detections = await faceapi.detectAllFaces(video)
    .withFaceLandmarks()
    .withFaceExpressions();
  
  // Store for user feedback ONLY (not scoring)
  return {
    confidenceIndicators: detections.map(d => d.expressions),
    eyeContact: calculateEyeContact(detections),
    engagement: calculateEngagement(detections)
  };
}
```

### 3. Interview Replay

```javascript
// Client component for reviewing past interviews
function InterviewReplay({ sessionId }) {
  const [turns, setTurns] = useState([]);
  
  useEffect(() => {
    fetch(`/api/interview/v3/sessions/${sessionId}`)
      .then(res => res.json())
      .then(data => setTurns(data.turns));
  }, [sessionId]);
  
  return (
    <div>
      {turns.map(turn => (
        <div key={turn.turnNumber}>
          <h3>Question {turn.turnNumber}</h3>
          <p>{turn.question.text}</p>
          
          {turn.media && (
            <video controls src={turn.media.streamUrl} />
          )}
          
          <div>Score: {turn.evaluation.overallScore}</div>
        </div>
      ))}
    </div>
  );
}
```

---

## Security Considerations

### Authentication

- All media endpoints require JWT authentication
- User ownership verified on every request
- Media can only be accessed by owning user

### File Validation

- File type checked via MIME type
- File size limited to 500MB
- Zero-byte files rejected
- File existence verified after upload

### Storage Security

- Files stored outside public directory
- Served via authenticated API only
- No direct file access
- Automatic cleanup on user deletion

### Privacy

- Videos never analyzed by AI for scoring
- No third-party video processing
- User can delete videos anytime
- Videos not shared without consent

---

## Support

### Common Questions

**Q: How long can recordings be?**
A: No hard time limit, but 500MB file size limit (~30-45 minutes at 720p)

**Q: Can I delete my videos?**
A: Yes, via DELETE /api/media/:id endpoint

**Q: Are videos backed up?**
A: Currently local storage only. S3 backup planned for future.

**Q: Can I download my videos?**
A: Yes, via GET /api/media/:id/stream (browser will prompt download)

**Q: Does this work on mobile?**
A: Yes, on iOS Safari 14.1+ and Android Chrome

---

## Contributing

### Adding New Features

1. Fork the repository
2. Create feature branch
3. Add tests
4. Update documentation
5. Submit pull request

### Reporting Issues

File issues at: [GitHub Issues](https://github.com/yourusername/prepwiser/issues)

Include:
- Browser and version
- Steps to reproduce
- Error messages
- Screenshots/video if applicable

---

## License

MIT License - See LICENSE file for details

---

## Credits

Built with:
- [WebRTC](https://webrtc.org/)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Multer](https://github.com/expressjs/multer)
- [Socket.IO](https://socket.io/)
- [React](https://react.dev/)

---

**Last Updated:** January 2024  
**Version:** 1.0.0  
**Maintainer:** PrepWiser Team
