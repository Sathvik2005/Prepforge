# 🚀 Video Interview - Quick Start

## ⚡ 5-Minute Setup

### 1. Verify Installation

```bash
# Check multer is installed
cd server
npm list multer
# Should show: multer@1.4.5-lts.2 ✓

# Verify upload directory exists
ls uploads/interviews
# Should exist ✓
```

### 2. Start Services

```bash
# Terminal 1 - Start Backend
cd e:\HackAura\prepwiser\server
npm start
# Wait for: "Server running on port 5000" ✓

# Terminal 2 - Start Frontend
cd e:\HackAura\prepwiser\client
npm run dev
# Wait for: "Local: http://localhost:5173" ✓
```

### 3. Test Video Interview

**Open Browser**: `http://localhost:5173/interview/live`

**Follow These Steps:**

1. ✅ **Grant Permissions**
   - Browser will ask for camera/microphone
   - Click "Allow"
   - You should see yourself on screen

2. ✅ **Start Interview**
   - Click "Start Interview" button
   - First question appears in ~2 seconds

3. ✅ **Record Answer**
   - Click "Start Recording"
   - Answer the question (speak for 30-60 seconds)
   - Timer will count up

4. ✅ **Submit Answer**
   - Click "Submit Answer"
   - Upload progress bar appears
   - Wait for evaluation (~5-10 seconds)

5. ✅ **Continue**
   - View your scores
   - Next question appears
   - Repeat 3-5 times

6. ✅ **Complete**
   - View final summary
   - See strengths and improvements

---

## 🎯 What Should Happen

### Console Output (Browser F12)

```javascript
Socket.IO: Connected to server ✓
Emitting start_interview event...
Socket.IO: interview_started event received ✓
First question: "Tell me about a time..." ✓

// After clicking "Start Recording"
Starting recording... ✓
MediaRecorder state: recording ✓
Recording timer: 1s
Recording timer: 2s
...

// After clicking "Submit Answer"
Stopping recording... ✓
Recording stopped. Size: 2.5 MB, Duration: 30s ✓
Uploading video... ✓
Upload progress: 10%
Upload progress: 25%
...
Upload progress: 100% ✓
Video uploaded successfully. Media ID: 64a1b2c3... ✓
Submitting answer to server... ✓

// Evaluation received
Socket.IO: next_question event received ✓
Evaluation scores: {clarity: 75, relevance: 80, ...} ✓
```

### Network Tab (F12)

```http
POST http://localhost:5000/api/media/upload
Status: 200 OK ✓
Size: 2.5 MB
Time: 20-30 seconds

Response:
{
  "success": true,
  "mediaId": "64a1b2c3d4e5f6...",
  "filename": "q1-1234567890-abc123.webm",
  "size": 2621440,
  "duration": 30
}
```

### File System

```bash
# Check videos were created
ls -lh server/uploads/interviews/interview_*/

# Expected output:
-rw-r--r-- 1 user user 2.5M Jan 15 10:30 q1-1234567890-abc123.webm ✓
-rw-r--r-- 1 user user 3.1M Jan 15 10:32 q2-1234567891-def456.webm ✓
-rw-r--r-- 1 user user 2.8M Jan 15 10:34 q3-1234567892-ghi789.webm ✓
```

### Database (MongoDB)

```javascript
// Check media records
db.media.find({}).pretty()

// Expected:
{
  _id: ObjectId("64a1b2c3..."),
  userId: ObjectId("..."),
  sessionId: "interview_123",
  questionId: "q1",
  filename: "q1-1234567890-abc123.webm",
  size: 2621440,
  duration: 30,
  mimeType: "video/webm"
} ✓

// Check interview has media references
db.conversationalinterviews.findOne({}, {turns: 1})

// Expected in turns[0]:
{
  media: {
    mediaId: ObjectId("64a1b2c3..."),
    duration: 30,
    size: 2621440,
    type: "video/webm"
  }
} ✓
```

---

## ❌ Common Issues

### Issue 1: "Permission denied"

**Cause**: Camera/mic permissions blocked

**Fix**:
```
Chrome: chrome://settings/content/camera
1. Allow camera and microphone for localhost
2. Refresh page and try again
```

### Issue 2: Upload fails (Network Error)

**Cause**: Server not running or wrong port

**Fix**:
```bash
# Verify server is running
curl http://localhost:5000/api/health
# Should return: {"status":"ok"}

# Check server logs
cd server
npm start
# Look for errors
```

### Issue 3: No question appears

**Cause**: Socket.IO connection failed

**Fix**:
```javascript
// Check browser console for:
Socket.IO: Connected to server ✓

// If not connected:
1. Verify server is running
2. Check CORS settings in server/index.js
3. Try different browser
```

### Issue 4: "File too large"

**Cause**: Recording exceeded 500MB

**Fix**:
```
Keep answers under 30 minutes
Or increase limit in server/routes/media.js:
limits: { fileSize: 1000 * 1024 * 1024 } // 1GB
```

---

## ✅ Success Checklist

After completing one full interview, verify:

- [ ] Browser console shows no errors
- [ ] Server logs show no errors
- [ ] Video files exist in `uploads/interviews/`
- [ ] MongoDB has media records
- [ ] Interview session has media references
- [ ] Evaluation scores displayed correctly
- [ ] Summary panel shows results

---

## 🎥 Test Video Playback

### Option 1: Browser

```javascript
// In browser console, get media ID from last upload:
const mediaId = "64a1b2c3d4e5f6..."; // From upload response

// Open streaming URL
window.open(`http://localhost:5000/api/media/${mediaId}/stream`);

// Should play video in browser ✓
```

### Option 2: cURL

```bash
# Download video
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/media/MEDIA_ID/stream \
     --output test.webm

# Play with VLC or browser
vlc test.webm
```

### Option 3: HTML Video Element

```html
<!-- Test in browser console -->
<video controls width="640">
  <source src="http://localhost:5000/api/media/MEDIA_ID/stream" type="video/webm">
</video>
```

---

## 📊 Performance Benchmarks

### Expected Timings

| Action | Duration | Notes |
|--------|----------|-------|
| Permission request | 1-2 sec | Browser popup |
| Start interview | 2-3 sec | Socket.IO + DB |
| Start recording | <1 sec | Instant |
| Stop recording | <1 sec | Blob creation |
| Upload 2.5MB | 20-30 sec | Depends on network |
| Evaluation | 5-10 sec | Processing + GPT |
| Next question | 1-2 sec | Socket.IO |
| Total per question | 60-90 sec | Excluding answer time |

### File Sizes (720p, vp8,opus)

| Duration | Size | Upload Time (1 Mbps) |
|----------|------|----------------------|
| 30 sec | ~2.5 MB | 20 sec |
| 1 min | ~5 MB | 40 sec |
| 2 min | ~10 MB | 80 sec |
| 5 min | ~25 MB | 200 sec |

---

## 🔍 Debugging Commands

### Check Server Health

```bash
# API health check
curl http://localhost:5000/api/health

# Check if media routes registered
curl http://localhost:5000/api/media/upload
# Should return 401 (auth required), not 404 ✓
```

### Check Database

```javascript
// MongoDB shell
mongosh

use prepwiser

// Count media records
db.media.find({}).count()
// Should match number of uploads ✓

// Find recent uploads
db.media.find({}).sort({uploadedAt: -1}).limit(5)

// Check interview sessions
db.conversationalinterviews.find({}).count()

// Verify media references
db.conversationalinterviews.aggregate([
  { $unwind: "$turns" },
  { $match: { "turns.media.mediaId": { $exists: true } } },
  { $count: "turnsWithMedia" }
])
```

### Check Files

```bash
# List all uploaded videos
find server/uploads/interviews -name "*.webm" -ls

# Check total storage used
du -sh server/uploads/interviews

# Count videos per session
find server/uploads/interviews -type d -mindepth 1 -maxdepth 1 | \
  while read dir; do 
    echo "$dir: $(find "$dir" -name "*.webm" | wc -l) videos"
  done
```

---

## 📝 Test Scenarios

### Scenario 1: Happy Path (5 min)

1. Start interview
2. Answer 3 questions with video
3. Complete interview
4. Verify all data saved

**Expected**: ✅ All pass

### Scenario 2: Permission Denied (2 min)

1. Block camera/mic permissions
2. Click "Start Interview"
3. See error message
4. Grant permissions and retry

**Expected**: ✅ Error handling works

### Scenario 3: Network Interruption (3 min)

1. Start recording answer
2. Disconnect network
3. Try to upload
4. Reconnect network
5. Retry upload

**Expected**: ✅ Retry succeeds

### Scenario 4: Long Answer (10 min)

1. Record 5-minute answer
2. Upload large file (~25MB)
3. Verify upload completes

**Expected**: ✅ Large file uploads

---

## 🎓 Next Actions

1. **Complete one full interview** (10-15 min)
2. **Verify database records** (5 min)
3. **Test video playback** (5 min)
4. **Review console logs** (5 min)
5. **Document any issues** (5 min)

**Total testing time**: ~30 minutes

---

## 📞 Need Help?

### Browser Console Errors

If you see errors, copy them to:
- `browser-errors.log`
- Include: timestamp, error message, stack trace

### Server Errors

If server crashes, copy logs to:
- `server-errors.log`
- Include: timestamp, request details, error message

### File Issues

If files don't upload:
1. Check `server/uploads/interviews/` exists
2. Verify write permissions
3. Check disk space: `df -h`

---

## ✅ Ready!

**System is configured and ready to test.**

**Start here**: Open `http://localhost:5173/interview/live` and follow the 6-step process above.

**Full guide**: See [VIDEO_INTERVIEW_GUIDE.md](VIDEO_INTERVIEW_GUIDE.md)

**Testing procedures**: See [TEST_VIDEO_INTERVIEW.md](TEST_VIDEO_INTERVIEW.md)

---

**Good luck! 🚀**
