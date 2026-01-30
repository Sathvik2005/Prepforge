import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import { Play, Save, Users, MessageSquare, Paintbrush, RotateCcw, Video, VideoOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

const CollaborativeEditor = ({ roomId, userId, userName, onLeave }) => {
  const [socket, setSocket] = useState(null);
  const [code, setCode] = useState('// Write your code here...\n');
  const [language, setLanguage] = useState('javascript');
  const [participants, setParticipants] = useState([]);
  const [cursors, setCursors] = useState(new Map());
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  const userColor = useRef(COLORS[Math.floor(Math.random() * COLORS.length)]);

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/collaboration`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('✨ Connected to collaboration server');
      newSocket.emit('join-room', { roomId, userId, userName });
    });

    newSocket.on('room-state', ({ code, language, whiteboard, participants }) => {
      setCode(code);
      setLanguage(language);
      setParticipants(participants);
      toast.success('Joined collaboration room!');
    });

    newSocket.on('user-joined', ({ userId, userName }) => {
      toast.success(`${userName} joined the session`);
      setParticipants(prev => [...prev, { userId, userName, isActive: true }]);
    });

    newSocket.on('user-left', ({ userId }) => {
      setParticipants(prev => prev.filter(p => p.userId !== userId));
    });

    newSocket.on('code-update', ({ content }) => {
      setCode(content);
    });

    newSocket.on('language-update', ({ language }) => {
      setLanguage(language);
      toast.info(`Language changed to ${language}`);
    });

    newSocket.on('cursor-update', ({ userId, userName, position, selection, color }) => {
      setCursors(prev => new Map(prev).set(userId, {
        userName,
        position,
        selection,
        color,
      }));
    });

    newSocket.on('whiteboard-update', ({ stroke }) => {
      drawStroke(stroke);
    });

    newSocket.on('whiteboard-cleared', () => {
      clearCanvas();
    });

    newSocket.on('chat-update', ({ userId, userName, message, timestamp }) => {
      setMessages(prev => [...prev, {
        userId,
        userName,
        message,
        timestamp: new Date(timestamp),
      }]);
    });

    newSocket.on('user-typing', ({ userId, userName, isTyping }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(userName);
        } else {
          newSet.delete(userName);
        }
        return newSet;
      });
    });

    newSocket.on('recording-started', () => {
      setIsRecording(true);
      toast.success('Recording started');
    });

    newSocket.on('recording-stopped', ({ duration }) => {
      setIsRecording(false);
      toast.success(`Recording stopped (${duration}s)`);
    });

    newSocket.on('error', ({ message }) => {
      toast.error(message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave-room', { roomId, userId });
      newSocket.disconnect();
    };
  }, [roomId, userId, userName]);

  // Handle code changes
  const handleCodeChange = useCallback((value) => {
    setCode(value);
    if (socket) {
      socket.emit('code-change', {
        roomId,
        content: value,
        userId,
      });
    }
  }, [socket, roomId, userId]);

  // Handle language change
  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    if (socket) {
      socket.emit('language-change', {
        roomId,
        language: newLanguage,
        userId,
      });
    }
  };

  // Handle cursor movement
  const handleCursorChange = useCallback(() => {
    if (!editorRef.current || !socket) return;

    const position = editorRef.current.getPosition();
    const selection = editorRef.current.getSelection();

    socket.emit('cursor-move', {
      roomId,
      position: { line: position.lineNumber, column: position.column },
      selection: selection ? {
        startLine: selection.startLineNumber,
        startColumn: selection.startColumn,
        endLine: selection.endLineNumber,
        endColumn: selection.endColumn,
      } : null,
      userId,
      userName,
      color: userColor.current,
    });
  }, [socket, roomId, userId, userName]);

  // Handle editor mount
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeCursorPosition(handleCursorChange);
    editor.onDidChangeCursorSelection(handleCursorChange);
  };

  // Whiteboard drawing
  const startDrawing = (e) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    lastPos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const draw = (e) => {
    if (!isDrawing.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.strokeStyle = userColor.current;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Emit stroke to others
    if (socket) {
      socket.emit('whiteboard-draw', {
        roomId,
        stroke: {
          id: Date.now().toString(),
          type: 'path',
          points: [[lastPos.current.x, lastPos.current.y], [x, y]],
          color: userColor.current,
          strokeWidth: 2,
        },
        userId,
      });
    }

    lastPos.current = { x, y };
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const drawStroke = (stroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.strokeWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();

    if (stroke.points.length >= 2) {
      ctx.moveTo(stroke.points[0][0], stroke.points[0][1]);
      ctx.lineTo(stroke.points[1][0], stroke.points[1][1]);
      ctx.stroke();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleClearWhiteboard = () => {
    clearCanvas();
    if (socket) {
      socket.emit('whiteboard-clear', { roomId, userId });
    }
  };

  // Send chat message
  const sendMessage = () => {
    if (!newMessage.trim() || !socket) return;

    socket.emit('chat-message', {
      roomId,
      message: newMessage,
      userId,
    });

    setNewMessage('');
  };

  // Run code (mock execution)
  const handleRunCode = () => {
    toast.success('Code execution would happen here');
  };

  // Save code
  const handleSaveCode = async () => {
    setIsSaving(true);
    try {
      // Save to backend
      await fetch(`${import.meta.env.VITE_API_URL}/api/collaboration/rooms/${roomId}/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: code, language }),
      });
      toast.success('Code saved!');
    } catch (error) {
      toast.error('Failed to save code');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle recording
  const toggleRecording = () => {
    if (!socket) return;

    if (isRecording) {
      socket.emit('recording-stop', { roomId, userId });
    } else {
      socket.emit('recording-start', { roomId, userId });
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="typescript">TypeScript</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
            </select>

            <button
              onClick={handleRunCode}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-1 rounded text-sm"
            >
              <Play size={16} />
              Run
            </button>

            <button
              onClick={handleSaveCode}
              disabled={isSaving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-1 rounded text-sm disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save
            </button>

            <button
              onClick={() => setShowWhiteboard(!showWhiteboard)}
              className={`flex items-center gap-2 px-4 py-1 rounded text-sm ${
                showWhiteboard ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <Paintbrush size={16} />
              Whiteboard
            </button>

            <button
              onClick={toggleRecording}
              className={`flex items-center gap-2 px-4 py-1 rounded text-sm ${
                isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {isRecording ? <VideoOff size={16} /> : <Video size={16} />}
              {isRecording ? 'Stop Recording' : 'Record'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span className="text-sm">{participants.length}</span>
            </div>
            <button
              onClick={onLeave}
              className="bg-red-600 hover:bg-red-700 px-4 py-1 rounded text-sm"
            >
              Leave
            </button>
          </div>
        </div>

        {/* Editor or Whiteboard */}
        <div className="flex-1 relative">
          {!showWhiteboard ? (
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={handleCodeChange}
              onMount={handleEditorDidMount}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: true },
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          ) : (
            <div className="relative w-full h-full bg-white">
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="w-full h-full"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <button
                onClick={handleClearWhiteboard}
                className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                <RotateCcw size={16} />
                Clear
              </button>
            </div>
          )}

          {/* Cursor overlays (for editor) */}
          {!showWhiteboard && Array.from(cursors.entries()).map(([cursorUserId, cursor]) => {
            if (cursorUserId === userId) return null;
            return (
              <div
                key={cursorUserId}
                className="absolute pointer-events-none"
                style={{
                  top: `${cursor.position?.line * 19}px`,
                  left: `${cursor.position?.column * 7}px`,
                }}
              >
                <div
                  className="w-0.5 h-5"
                  style={{ backgroundColor: cursor.color }}
                />
                <div
                  className="text-xs px-1 rounded"
                  style={{ backgroundColor: cursor.color, color: 'white' }}
                >
                  {cursor.userName}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Sidebar */}
      {showChat && (
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={20} />
              <h3 className="font-semibold">Chat</h3>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((msg, idx) => (
              <div key={idx} className="text-sm">
                <span className="font-semibold text-blue-400">{msg.userName}:</span>
                <span className="ml-2 text-gray-300">{msg.message}</span>
              </div>
            ))}
            {typingUsers.size > 0 && (
              <div className="text-xs text-gray-400 italic">
                {Array.from(typingUsers).join(', ')} typing...
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
              />
              <button
                onClick={sendMessage}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show chat button when hidden */}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 p-3 rounded-full shadow-lg"
        >
          <MessageSquare size={24} />
        </button>
      )}
    </div>
  );
};

export default CollaborativeEditor;
