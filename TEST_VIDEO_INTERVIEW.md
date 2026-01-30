# 🧪 Video Interview System - Testing Guide

## Quick Start Test

### Prerequisites

1. ✅ Multer installed: `npm list multer` (should show multer@1.4.5-lts.2)
2. ✅ Upload directory exists: `server/uploads/interviews/`
3. ✅ Media routes registered in `server/index.js`
4. ✅ Server running: `npm start`
5. ✅ Client running: `npm run dev`

---

## Manual Test Procedure

### Test 1: Basic Camera/Mic Access

**Steps:**
1. Navigate to `http://localhost:5173/interview/live`
2. Open browser DevTools (F12)
3. Click "Start Interview" button
4. Browser should prompt for camera/microphone permissions
5. Click "Allow"

**Expected Result:**
- ✅ Video preview appears
- ✅ Console shows: `"Camera and microphone access granted"`
- ✅ No errors in console

**Troubleshooting:**
- If "Permission denied": Check browser settings (chrome://settings/content/camera)
- If "No camera found": Verify camera is connected
- If "Already in use": Close other apps using camera

---

### Test 2: Start Interview & Socket Connection

**Steps:**
1. After granting permissions, click "Start Interview"
2. Watch console for Socket.IO events

**Expected Console Output:**
```
Socket.IO: Connected to server
Emitting start_interview event...
Socket.IO: interview_started event received
First question: <question text>
```

**Expected UI:**
- ✅ Connection indicator turns green
- ✅ First question appears
- ✅ "Start Recording" button is enabled

**Troubleshooting:**
- If connection fails: Check server is running on port 5000
- If no question: Check server logs for errors
- If stuck: Check Network tab for Socket.IO connection

---

### Test 3: Video Recording

**Steps:**
1. Click "Start Recording" button
2. Answer the question out loud (speak for 30-60 seconds)
3. Observe recording indicator

**Expected Result:**
- ✅ Red blinking dot appears
- ✅ Timer starts counting (00:01, 00:02, ...)
- ✅ Video preview shows live feed
- ✅ Console shows: `"Recording started"`

**Expected Console Output:**
```
Starting recording...
MediaRecorder state: recording
Recording timer: 1s
Recording timer: 2s
...
```

**Troubleshooting:**
- If recording doesn't start: Check browser console for MediaRecorder errors
- If no timer: Check useMediaRecorder hook implementation
- If no video: Verify camera permissions are granted

---

### Test 4: Stop Recording & Upload

**Steps:**
1. Click "Submit Answer" button
2. Watch upload progress bar

**Expected Console Output:**
```
Stopping recording...
Recording stopped. Size: 2.5 MB, Duration: 30s
Uploading video...
Upload progress: 10%
Upload progress: 25%
Upload progress: 50%
Upload progress: 75%
Upload progress: 100%
Video uploaded successfully. Media ID: 64a1b2c3d4e5f6...
Submitting answer to server...
```

**Expected UI:**
- ✅ Recording stops
- ✅ Upload progress bar appears
- ✅ Progress bar fills to 100%
- ✅ "Evaluating your answer..." message appears

**Expected Network Request:**
```http
POST http://localhost:5000/api/media/upload
Status: 200 OK
Response: {
  "success": true,
  "mediaId": "64a1b2c3d4e5f6...",
  "filename": "q1-1234567890-abc123.webm",
  "size": 2621440,
  "duration": 30
}
```

**Expected File System:**
```
server/uploads/interviews/interview_123/
└── q1-1234567890-abc123.webm (2.5 MB)
```

**Troubleshooting:**
- If upload fails: Check server logs for multer errors
- If 413 error: File too large (>500MB)
- If 415 error: Invalid mime type
- If stuck at 0%: Check network connection

---

### Test 5: Receive Evaluation

**Expected Console Output:**
```
Socket.IO: next_question event received
Evaluation scores: {
  clarity: 75,
  relevance: 80,
  depth: 70,
  structure: 85
}
```

**Expected UI:**
- ✅ Evaluation panel appears
- ✅ Score circle shows overall score (e.g., 77.5/100)
- ✅ Metric bars show individual scores
- ✅ Strengths list appears (e.g., "Clear communication")
- ✅ Improvements list appears (e.g., "Provide more examples")
- ✅ Next question appears

**Troubleshooting:**
- If no evaluation: Check server logs for orchestrator errors
- If wrong scores: Verify evaluation formulas in evaluationService.js
- If no next question: Check interview completion logic

---

### Test 6: Database Verification

**Steps:**
1. Open MongoDB Compass or mongo shell
2. Connect to database
3. Query collections

**Media Collection:**
```javascript
// Find media records for session
db.media.find({ sessionId: "interview_123" });

// Expected result
{
  _id: ObjectId("64a1b2c3d4e5f6..."),
  userId: ObjectId("64a1b2c3d4e5f6..."),
  sessionId: "interview_123",
  questionId: "q1",
  filename: "q1-1234567890-abc123.webm",
  filepath: "uploads/interviews/interview_123/q1-1234567890-abc123.webm",
  mimeType: "video/webm",
  size: 2621440,
  duration: 30,
  codec: "vp8,opus",
  uploadedAt: ISODate("2024-01-15T10:30:00Z"),
  metadata: {
    transcriptionStatus: "pending",
    transcriptionText: null
  }
}
```

**ConversationalInterview Collection:**
```javascript
// Find interview session
db.conversationalinterviews.findOne({ _id: "interview_123" });

// Expected turns[0].media
{
  turns: [{
    turnNumber: 1,
    question: { ... },
    answer: {
      text: "My answer...",
      timestamp: ISODate("2024-01-15T10:30:00Z"),
      timeSpent: 30,
      wordCount: 50
    },
    media: {
      mediaId: ObjectId("64a1b2c3d4e5f6..."),
      duration: 30,
      size: 2621440,
      type: "video/webm",
      streamUrl: "/api/media/64a1b2c3d4e5f6.../stream"
    },
    evaluation: { ... }
  }]
}
```

**Verification Checklist:**
- [ ] Media document exists with correct sessionId and questionId
- [ ] filepath points to existing file
- [ ] size and duration are populated
- [ ] ConversationalInterview has media reference in turn
- [ ] mediaId matches Media._id

---

### Test 7: Video Streaming

**Steps:**
1. Copy media ID from previous test
2. Open browser to: `http://localhost:5000/api/media/{mediaId}/stream`
3. Or use curl: `curl -H "Authorization: Bearer {token}" http://localhost:5000/api/media/{mediaId}/stream --output test.webm`

**Expected Result:**
- ✅ Video downloads or plays in browser
- ✅ Video is playable
- ✅ Audio is present

**Expected HTTP Headers:**
```http
HTTP/1.1 200 OK
Content-Type: video/webm
Content-Length: 2621440
Accept-Ranges: bytes
```

**Test Range Request:**
```bash
curl -H "Authorization: Bearer {token}" \
     -H "Range: bytes=0-1048575" \
     http://localhost:5000/api/media/{mediaId}/stream
```

**Expected Response:**
```http
HTTP/1.1 206 Partial Content
Content-Type: video/webm
Content-Range: bytes 0-1048575/2621440
Content-Length: 1048576
Accept-Ranges: bytes
```

**Troubleshooting:**
- If 401: Check authentication token
- If 403: Verify user owns media
- If 404: Media ID not found
- If 416: Invalid range request

---

### Test 8: Complete Interview Flow

**Steps:**
1. Start fresh interview
2. Answer 3-5 questions with video
3. Complete interview

**Expected Console Timeline:**
```
[00:00] Socket.IO: Connected
[00:01] Emitting start_interview
[00:02] Received first question
[00:05] Started recording (Q1)
[00:35] Stopped recording (Q1)
[00:36] Uploading Q1... 100%
[00:37] Submitted answer Q1
[00:38] Received evaluation Q1
[00:39] Received question Q2
[00:42] Started recording (Q2)
[01:12] Stopped recording (Q2)
[01:13] Uploading Q2... 100%
[01:14] Submitted answer Q2
[01:15] Received evaluation Q2
...
[05:00] Interview completed
[05:01] Summary displayed
```

**Expected Final State:**

**Files Created:**
```
server/uploads/interviews/interview_123/
├── q1-1234567890-abc123.webm
├── q2-1234567891-def456.webm
├── q3-1234567892-ghi789.webm
└── q4-1234567893-jkl012.webm
```

**Database Records:**
- 1 ConversationalInterview document with 4 turns
- 4 Media documents
- All turns have media references

**UI Elements:**
- ✅ Summary panel shows:
  - Total questions answered
  - Average score
  - Total interview duration
  - Strengths list
  - Improvements list
  - Recommendation

---

## Error Handling Tests

### Test 9: Permission Denied

**Steps:**
1. Navigate to interview page
2. Click "Start Interview"
3. Click "Block" on camera/microphone prompt

**Expected Result:**
- ✅ Error message: "Permission denied. Please allow camera and microphone access..."
- ✅ "Retry" button appears
- ✅ No crash or infinite loop

---

### Test 10: Network Failure During Upload

**Steps:**
1. Start recording
2. Answer question
3. Disable network (airplane mode or unplug ethernet)
4. Click "Submit Answer"

**Expected Result:**
- ✅ Upload progress shows error
- ✅ Error message: "Upload failed. Please check your connection."
- ✅ "Retry" button appears
- ✅ Video blob is retained for retry

---

### Test 11: Socket Disconnect During Interview

**Steps:**
1. Start interview and answer first question
2. Stop server
3. Try to submit answer

**Expected Result:**
- ✅ Connection indicator turns red
- ✅ UI shows "Reconnecting..." message
- ✅ When server restarts, Socket.IO reconnects
- ✅ Interview can resume

---

### Test 12: Large File Upload (>500MB)

**Steps:**
1. Record very long answer (>45 minutes to exceed 500MB)
2. Try to upload

**Expected Result:**
- ✅ Server rejects with 413 Payload Too Large
- ✅ UI shows: "File too large. Please keep answers under 30 minutes."
- ✅ File not saved to disk

---

## Performance Tests

### Test 13: Multiple Uploads in Parallel

**Steps:**
1. Open 3 browser tabs with interview page
2. Start all 3 interviews simultaneously
3. Record and upload answers at the same time

**Expected Result:**
- ✅ All uploads succeed
- ✅ No server crashes
- ✅ Each upload gets unique filename
- ✅ No file conflicts

---

### Test 14: Long Interview (10+ Questions)

**Steps:**
1. Start interview
2. Answer 10+ questions with video
3. Monitor memory usage

**Expected Result:**
- ✅ Memory usage stays reasonable (<2GB)
- ✅ No memory leaks
- ✅ Video preview cleanup between questions
- ✅ All files uploaded successfully

---

## Browser Compatibility Tests

### Test 15: Cross-Browser Testing

**Chrome:**
- ✅ Full functionality
- ✅ video/webm codec supported

**Edge:**
- ✅ Full functionality
- ✅ video/webm codec supported

**Firefox:**
- ✅ Full functionality
- ✅ video/webm codec supported

**Safari:**
- ⚠️ May require video/mp4 codec
- Test codec detection: `MediaRecorder.isTypeSupported('video/webm')`

---

## Security Tests

### Test 16: Unauthorized Access

**Steps:**
1. Upload video and get media ID
2. Log out
3. Try to access: `GET /api/media/{mediaId}/stream`

**Expected Result:**
- ✅ 401 Unauthorized
- ✅ No video served

---

### Test 17: Cross-User Access

**Steps:**
1. User A uploads video
2. User B tries to access User A's media ID
3. Try: `GET /api/media/{userA_mediaId}`

**Expected Result:**
- ✅ 403 Forbidden
- ✅ Message: "You don't have permission to access this media"

---

## Automated Test Script

```javascript
// test/video-interview.test.js
describe('Video Interview System', () => {
  
  it('should request camera permissions', async () => {
    const { requestPermissions } = useMediaRecorder();
    const result = await requestPermissions();
    expect(result).toBe(true);
  });
  
  it('should start recording', async () => {
    const { startRecording, isRecording } = useMediaRecorder();
    await startRecording();
    expect(isRecording).toBe(true);
  });
  
  it('should stop recording and return blob', async () => {
    const { startRecording, stopRecording } = useMediaRecorder();
    await startRecording();
    await new Promise(r => setTimeout(r, 3000)); // Record 3 seconds
    const result = await stopRecording();
    
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.duration).toBeGreaterThan(2);
    expect(result.size).toBeGreaterThan(0);
  });
  
  it('should upload video successfully', async () => {
    const blob = new Blob(['test'], { type: 'video/webm' });
    const formData = new FormData();
    formData.append('video', blob);
    formData.append('sessionId', 'test_session');
    formData.append('questionId', 'q1');
    
    const response = await fetch('http://localhost:5000/api/media/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.mediaId).toBeDefined();
  });
  
  it('should stream video with range requests', async () => {
    const response = await fetch(`http://localhost:5000/api/media/${mediaId}/stream`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Range': 'bytes=0-1048575'
      }
    });
    
    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toMatch(/bytes 0-1048575\//);
  });
  
});
```

---

## Test Results Log

| Test # | Test Name | Status | Date | Notes |
|--------|-----------|--------|------|-------|
| 1 | Camera/Mic Access | ⏳ Pending | - | - |
| 2 | Socket Connection | ⏳ Pending | - | - |
| 3 | Video Recording | ⏳ Pending | - | - |
| 4 | Upload | ⏳ Pending | - | - |
| 5 | Evaluation | ⏳ Pending | - | - |
| 6 | Database | ⏳ Pending | - | - |
| 7 | Streaming | ⏳ Pending | - | - |
| 8 | Complete Flow | ⏳ Pending | - | - |
| 9 | Permission Denied | ⏳ Pending | - | - |
| 10 | Network Failure | ⏳ Pending | - | - |
| 11 | Socket Disconnect | ⏳ Pending | - | - |
| 12 | Large File | ⏳ Pending | - | - |
| 13 | Parallel Uploads | ⏳ Pending | - | - |
| 14 | Long Interview | ⏳ Pending | - | - |
| 15 | Cross-Browser | ⏳ Pending | - | - |
| 16 | Unauthorized | ⏳ Pending | - | - |
| 17 | Cross-User | ⏳ Pending | - | - |

---

## Next Steps

1. **Run Tests 1-8** (Core functionality)
2. **Verify Database** (Check MongoDB records)
3. **Test Error Handling** (Tests 9-12)
4. **Performance Testing** (Tests 13-14)
5. **Security Audit** (Tests 16-17)
6. **Cross-Browser** (Test 15)
7. **Document Results** (Update test log above)

---

## Success Criteria

✅ **All tests pass**
✅ **No errors in browser console**
✅ **No errors in server logs**
✅ **Files created in uploads/ directory**
✅ **Database records created correctly**
✅ **Video playback works**
✅ **Evaluation scores displayed**
✅ **Interview completes successfully**

---

**Ready to test!** 🚀
