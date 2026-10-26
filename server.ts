import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

interface Participant {
  id: string;
  name: string;
  role: 'teacher' | 'student';
  avatar?: string;
  handRaised?: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isScreenSharing?: boolean;
  joinedAt: number;
  keyFingerprint?: string;
  ws?: WebSocket;
}

interface Poll {
  id: string;
  question: string;
  options: { id: string; text: string; votes: number }[];
  voters: Record<string, string>; // participantId -> optionId
  isClosed: boolean;
  createdBy: string;
}

interface Room {
  id: string;
  name: string;
  createdAt: number;
  isLocked: boolean;
  allowStudentScreenshare: boolean;
  allowStudentWhiteboard: boolean;
  activeView: 'stage' | 'whiteboard' | 'document' | 'screenshare';
  spotlightParticipantId: string | null;
  participants: Map<string, Participant>;
  whiteboardData: any[]; // serialized strokes / elements
  documentContent: string;
  activePoll: Poll | null;
  attendanceLog: { id: string; name: string; role: string; joinedAt: number; leftAt?: number }[];
}

const rooms = new Map<string, Room>();

function getOrCreateRoom(roomId: string, initialName?: string): Room {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      name: initialName || `Physics 301 - Wave Optics & Quantum Mechanics`,
      createdAt: Date.now(),
      isLocked: false,
      allowStudentScreenshare: true,
      allowStudentWhiteboard: true,
      activeView: 'stage',
      spotlightParticipantId: null,
      participants: new Map(),
      whiteboardData: [
        {
          id: 'wb-init-1',
          tool: 'text',
          color: '#0EA5E9',
          strokeWidth: 2,
          points: [{ x: 60, y: 50 }],
          startX: 60,
          startY: 50,
          text: "Young's Double-Slit Optical Experiment (λ = 632.8 nm)",
          userId: 'teacher-elena',
          timestamp: Date.now() - 3600000
        },
        {
          id: 'wb-init-2',
          tool: 'rectangle',
          color: '#2563EB',
          strokeWidth: 2,
          points: [{ x: 60, y: 160 }, { x: 150, y: 240 }],
          startX: 60,
          startY: 160,
          endX: 150,
          endY: 240,
          userId: 'teacher-elena',
          timestamp: Date.now() - 3500000
        },
        {
          id: 'wb-init-3',
          tool: 'text',
          color: '#FFFFFF',
          strokeWidth: 2,
          points: [{ x: 75, y: 205 }],
          startX: 75,
          startY: 205,
          text: 'Laser (He-Ne)',
          userId: 'teacher-elena',
          timestamp: Date.now() - 3400000
        },
        {
          id: 'wb-init-4',
          tool: 'arrow',
          color: '#DC2626',
          strokeWidth: 3,
          points: [{ x: 150, y: 200 }, { x: 260, y: 200 }],
          startX: 150,
          startY: 200,
          endX: 260,
          endY: 200,
          userId: 'teacher-elena',
          timestamp: Date.now() - 3300000
        },
        {
          id: 'wb-init-5',
          tool: 'rectangle',
          color: '#FFFFFF',
          strokeWidth: 3,
          points: [{ x: 260, y: 110 }, { x: 266, y: 310 }],
          startX: 260,
          startY: 110,
          endX: 266,
          endY: 310,
          userId: 'teacher-elena',
          timestamp: Date.now() - 3200000
        },
        {
          id: 'wb-init-6',
          tool: 'text',
          color: '#D97706',
          strokeWidth: 2,
          points: [{ x: 275, y: 165 }],
          startX: 275,
          startY: 165,
          text: 'Slit S1',
          userId: 'teacher-elena',
          timestamp: Date.now() - 3100000
        },
        {
          id: 'wb-init-7',
          tool: 'text',
          color: '#D97706',
          strokeWidth: 2,
          points: [{ x: 275, y: 255 }],
          startX: 275,
          startY: 255,
          text: 'Slit S2',
          userId: 'teacher-elena',
          timestamp: Date.now() - 3000000
        },
        {
          id: 'wb-init-8',
          tool: 'arrow',
          color: '#DC2626',
          strokeWidth: 2,
          points: [{ x: 266, y: 160 }, { x: 580, y: 140 }],
          startX: 266,
          startY: 160,
          endX: 580,
          endY: 140,
          userId: 'teacher-elena',
          timestamp: Date.now() - 2900000
        },
        {
          id: 'wb-init-9',
          tool: 'arrow',
          color: '#16A34A',
          strokeWidth: 2,
          points: [{ x: 266, y: 250 }, { x: 580, y: 140 }],
          startX: 266,
          startY: 250,
          endX: 580,
          endY: 140,
          userId: 'teacher-elena',
          timestamp: Date.now() - 2800000
        },
        {
          id: 'wb-init-10',
          tool: 'rectangle',
          color: '#FFFFFF',
          strokeWidth: 3,
          points: [{ x: 580, y: 90 }, { x: 586, y: 330 }],
          startX: 580,
          startY: 90,
          endX: 586,
          endY: 330,
          userId: 'teacher-elena',
          timestamp: Date.now() - 2700000
        },
        {
          id: 'wb-init-11',
          tool: 'text',
          color: '#2563EB',
          strokeWidth: 2,
          points: [{ x: 280, y: 350 }],
          startX: 280,
          startY: 350,
          text: 'ΔL = d · sin(θ) = m · λ  (Constructive Interference)',
          userId: 'teacher-elena',
          timestamp: Date.now() - 2600000
        },
        {
          id: 'wb-init-12',
          tool: 'text',
          color: '#16A34A',
          strokeWidth: 2,
          points: [{ x: 280, y: 385 }],
          startX: 280,
          startY: 385,
          text: 'Fringe Width: β = λ · D / d',
          userId: 'teacher-elena',
          timestamp: Date.now() - 2500000
        }
      ],
      documentContent: `# Lecture 14: Young's Double-Slit Experiment & Coherence

## 1. Physical Principle
In 1801, Thomas Young demonstrated the wave nature of light using two coherent pinholes separated by distance **d**. 

$$ \\Delta x = S_2 P - S_1 P = d \\sin(\\theta) \\approx \\frac{dy}{D} $$

### Conditions for Interference:
* **Constructive Interference (Bright Fringes)**:
  Path difference: $\\Delta L = m\\lambda$ where $m = 0, \\pm 1, \\pm 2...$
  Fringe width: $\\beta = \\frac{\\lambda D}{d}$
* **Destructive Interference (Dark Fringes)**:
  Path difference: $\\Delta L = (m + \\frac{1}{2})\\lambda$

## 2. Classroom Action Items & Problem Set
- [x] Review Snell's Law and phase shifts on reflection
- [ ] Calculate distance between $m=0$ and $m=3$ for $\\lambda = 632.8\\text{ nm}$ laser
- [ ] Verify safety numbers and submit experiment group report
`,
      activePoll: {
        id: 'poll-1',
        question: 'What happens to the fringe width if the slit separation (d) is doubled?',
        options: [
          { id: 'opt-1', text: 'Fringe width doubles (2x)', votes: 1 },
          { id: 'opt-2', text: 'Fringe width is halved (0.5x)', votes: 3 },
          { id: 'opt-3', text: 'Remains unchanged', votes: 0 },
          { id: 'opt-4', text: 'Depends on light wavelength', votes: 0 }
        ],
        voters: { 'student-mock-1': 'opt-2', 'student-mock-2': 'opt-2', 'student-mock-3': 'opt-1' },
        isClosed: false,
        createdBy: 'Dr. Elena Vance'
      },
      attendanceLog: [
        { id: 'inst-1', name: 'Dr. Elena Vance (Instructor)', role: 'teacher', joinedAt: Date.now() - 1800000 },
        { id: 'stu-1', name: 'Sarah Chen', role: 'student', joinedAt: Date.now() - 1500000 },
        { id: 'stu-2', name: 'David Kim', role: 'student', joinedAt: Date.now() - 1200000 },
        { id: 'stu-3', name: 'Maya Patel', role: 'student', joinedAt: Date.now() - 900000 }
      ]
    };
    rooms.set(roomId, room);
  }
  return room;
}

// Broadcast helper
function broadcastToRoom(room: Room, message: any, excludeParticipantId?: string) {
  const payload = JSON.stringify(message);
  for (const [id, participant] of room.participants.entries()) {
    if (id !== excludeParticipantId && participant.ws && participant.ws.readyState === WebSocket.OPEN) {
      participant.ws.send(payload);
    }
  }
}

// REST API for room info
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now(), activeRooms: rooms.size });
});

app.get('/api/room/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  const participantList = Array.from(room.participants.values()).map(p => ({
    id: p.id,
    name: p.name,
    role: p.role,
    avatar: p.avatar,
    handRaised: p.handRaised,
    isMuted: p.isMuted,
    isCameraOff: p.isCameraOff,
    isScreenSharing: p.isScreenSharing
  }));
  res.json({
    id: room.id,
    name: room.name,
    isLocked: room.isLocked,
    participantsCount: room.participants.size,
    participants: participantList
  });
});

// GitHub OAuth authorization URL endpoint
app.get('/api/auth/github/url', (req, res) => {
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${appUrl.replace(/\/$/, '')}/auth/github/callback`;
  const clientId = process.env.GITHUB_CLIENT_ID;

  if (!clientId || clientId === 'MY_GITHUB_CLIENT_ID') {
    return res.json({
      isConfigured: false,
      callbackUrl: redirectUri,
      url: null,
      message: 'GITHUB_CLIENT_ID not configured in environment variables.'
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    allow_signup: 'true'
  });

  res.json({
    isConfigured: true,
    callbackUrl: redirectUri,
    url: `https://github.com/login/oauth/authorize?${params.toString()}`
  });
});

// GitHub OAuth callback endpoint (handling both trailing slash variations)
app.get(['/auth/github/callback', '/auth/github/callback/'], async (req, res) => {
  const { code } = req.query;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!code || typeof code !== 'string') {
    return res.status(400).send('Authorization code missing.');
  }

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error(tokenData.error_description || 'Failed to exchange authorization code.');
    }

    // Fetch user profile from GitHub
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'CipherClass-Virtual-Classroom'
      }
    });

    const userData = await userRes.json();

    // Return HTML that posts message to opener and closes popup
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            .card { background: #1e293b; padding: 2rem; border-radius: 1rem; border: 1px solid #334155; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>GitHub Authentication Successful</h2>
            <p>Connecting ${userData.name || userData.login} to CipherClass...</p>
            <script>
              const payload = {
                type: 'OAUTH_AUTH_SUCCESS',
                provider: 'github',
                user: {
                  id: "${userData.id}",
                  login: "${userData.login}",
                  name: "${(userData.name || userData.login).replace(/"/g, '\\"')}",
                  avatar_url: "${userData.avatar_url}"
                }
              };
              if (window.opener) {
                window.opener.postMessage(payload, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <body style="font-family: system-ui; background: #0f172a; color: #f87171; padding: 2rem; text-align: center;">
          <h3>Authentication Error</h3>
          <p>${err.message || 'Unknown error occurred during GitHub login.'}</p>
          <button onclick="window.close()" style="background: #334155; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer;">Close Window</button>
        </body>
      </html>
    `);
  }
});

// Proxy to fetch raw GitHub file / markdown for classroom notes & collaboration
app.get('/api/github/fetch-file', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL query parameter required.' });
  }

  try {
    let targetUrl = url;
    // Convert github.com blob URLs to raw.githubusercontent.com
    if (targetUrl.includes('github.com') && targetUrl.includes('/blob/')) {
      targetUrl = targetUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }

    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'CipherClass-Virtual-Classroom' }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch GitHub file.' });
    }

    const text = await response.text();
    res.json({ content: text, url: targetUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch GitHub file.' });
  }
});

const server = http.createServer(app);

// WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let currentRoomId: string | null = null;
  let currentParticipantId: string | null = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      const { type, roomId, participantId } = message;

      switch (type) {
        case 'join_room': {
          const room = getOrCreateRoom(roomId, message.roomName);
          if (room.isLocked && message.role !== 'teacher') {
            ws.send(JSON.stringify({ type: 'error', code: 'ROOM_LOCKED', message: 'This classroom is locked by the instructor.' }));
            return;
          }

          currentRoomId = roomId;
          currentParticipantId = participantId;

          const participant: Participant = {
            id: participantId,
            name: message.name || 'Anonymous User',
            role: message.role || 'student',
            avatar: message.avatar,
            handRaised: false,
            isMuted: !!message.isMuted,
            isCameraOff: !!message.isCameraOff,
            isScreenSharing: false,
            joinedAt: Date.now(),
            keyFingerprint: message.keyFingerprint,
            ws
          };

          room.participants.set(participantId, participant);
          room.attendanceLog.push({
            id: participant.id,
            name: participant.name,
            role: participant.role,
            joinedAt: participant.joinedAt
          });

          // Compile safe participant list for peers
          const participantsPayload = Array.from(room.participants.values()).map(p => ({
            id: p.id,
            name: p.name,
            role: p.role,
            avatar: p.avatar,
            handRaised: p.handRaised,
            isMuted: p.isMuted,
            isCameraOff: p.isCameraOff,
            isScreenSharing: p.isScreenSharing,
            joinedAt: p.joinedAt,
            keyFingerprint: p.keyFingerprint
          }));

          // Send full room state to newly joined user
          ws.send(JSON.stringify({
            type: 'room_state',
            roomId: room.id,
            roomName: room.name,
            isLocked: room.isLocked,
            allowStudentScreenshare: room.allowStudentScreenshare,
            allowStudentWhiteboard: room.allowStudentWhiteboard,
            activeView: room.activeView,
            spotlightParticipantId: room.spotlightParticipantId,
            participants: participantsPayload,
            whiteboardData: room.whiteboardData,
            documentContent: room.documentContent,
            activePoll: room.activePoll,
            attendanceLog: room.attendanceLog
          }));

          // Notify existing peers
          broadcastToRoom(room, {
            type: 'peer_joined',
            participant: {
              id: participant.id,
              name: participant.name,
              role: participant.role,
              avatar: participant.avatar,
              handRaised: participant.handRaised,
              isMuted: participant.isMuted,
              isCameraOff: participant.isCameraOff,
              isScreenSharing: participant.isScreenSharing,
              joinedAt: participant.joinedAt,
              keyFingerprint: participant.keyFingerprint
            }
          }, participantId);
          break;
        }

        case 'update_status': {
          if (!currentRoomId || !currentParticipantId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;
          const participant = room.participants.get(currentParticipantId);
          if (!participant) return;

          if (message.isMuted !== undefined) participant.isMuted = message.isMuted;
          if (message.isCameraOff !== undefined) participant.isCameraOff = message.isCameraOff;
          if (message.isScreenSharing !== undefined) {
            participant.isScreenSharing = message.isScreenSharing;
            if (message.isScreenSharing) {
              room.activeView = 'screenshare';
            } else if (room.activeView === 'screenshare') {
              room.activeView = 'stage';
            }
          }
          if (message.handRaised !== undefined) participant.handRaised = message.handRaised;
          if (message.keyFingerprint) participant.keyFingerprint = message.keyFingerprint;

          broadcastToRoom(room, {
            type: 'participant_updated',
            participantId: currentParticipantId,
            updates: {
              isMuted: participant.isMuted,
              isCameraOff: participant.isCameraOff,
              isScreenSharing: participant.isScreenSharing,
              handRaised: participant.handRaised,
              keyFingerprint: participant.keyFingerprint
            },
            activeView: room.activeView
          });
          break;
        }

        case 'webrtc_signal': {
          // Relaying WebRTC offer, answer, or candidate to target peer
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;
          const target = room.participants.get(message.targetId);
          if (target && target.ws && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(JSON.stringify({
              type: 'webrtc_signal',
              senderId: currentParticipantId,
              signal: message.signal
            }));
          }
          break;
        }

        case 'encrypted_chat_message': {
          // Zero-knowledge forwarding: server receives and broadcasts encrypted payload
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;
          broadcastToRoom(room, {
            type: 'encrypted_chat_message',
            message: message.message
          });
          break;
        }

        case 'whiteboard_sync': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;
          // Check permissions
          const sender = room.participants.get(currentParticipantId || '');
          if (sender?.role === 'student' && !room.allowStudentWhiteboard) {
            return;
          }
          room.whiteboardData = message.whiteboardData || [];
          broadcastToRoom(room, {
            type: 'whiteboard_sync',
            whiteboardData: room.whiteboardData,
            senderId: currentParticipantId
          }, currentParticipantId || undefined);
          break;
        }

        case 'document_sync': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;
          room.documentContent = message.documentContent;
          broadcastToRoom(room, {
            type: 'document_sync',
            documentContent: room.documentContent,
            senderId: currentParticipantId,
            senderName: message.senderName
          }, currentParticipantId || undefined);
          break;
        }

        case 'switch_view': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;
          room.activeView = message.view;
          broadcastToRoom(room, {
            type: 'view_switched',
            view: room.activeView,
            senderId: currentParticipantId
          });
          break;
        }

        case 'reaction_burst': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;
          broadcastToRoom(room, {
            type: 'reaction_burst',
            emoji: message.emoji,
            senderName: message.senderName || 'Participant',
            senderId: currentParticipantId
          });
          break;
        }

        case 'teacher_action': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;
          const sender = room.participants.get(currentParticipantId || '');
          if (sender?.role !== 'teacher') return; // Enforce teacher role

          switch (message.action) {
            case 'mute_all':
              for (const [id, p] of room.participants.entries()) {
                if (p.role === 'student') {
                  p.isMuted = true;
                }
              }
              broadcastToRoom(room, { type: 'mute_all_enforced' });
              break;

            case 'toggle_lock':
              room.isLocked = !!message.isLocked;
              broadcastToRoom(room, { type: 'room_lock_changed', isLocked: room.isLocked });
              break;

            case 'toggle_student_screen':
              room.allowStudentScreenshare = !!message.allowed;
              broadcastToRoom(room, { type: 'permissions_changed', allowStudentScreenshare: room.allowStudentScreenshare });
              break;

            case 'toggle_student_whiteboard':
              room.allowStudentWhiteboard = !!message.allowed;
              broadcastToRoom(room, { type: 'permissions_changed', allowStudentWhiteboard: room.allowStudentWhiteboard });
              break;

            case 'spotlight_speaker':
              room.spotlightParticipantId = message.spotlightId || null;
              broadcastToRoom(room, { type: 'spotlight_changed', spotlightParticipantId: room.spotlightParticipantId });
              break;

            case 'lower_student_hand':
              const target = room.participants.get(message.targetId);
              if (target) {
                target.handRaised = false;
                broadcastToRoom(room, {
                  type: 'participant_updated',
                  participantId: message.targetId,
                  updates: { handRaised: false }
                });
              }
              break;

            case 'create_poll':
              room.activePoll = {
                id: `poll-${Date.now()}`,
                question: message.question,
                options: message.options.map((text: string, i: number) => ({ id: `opt-${i}`, text, votes: 0 })),
                voters: {},
                isClosed: false,
                createdBy: sender.name
              };
              broadcastToRoom(room, { type: 'poll_updated', poll: room.activePoll });
              break;

            case 'close_poll':
              if (room.activePoll) {
                room.activePoll.isClosed = true;
                broadcastToRoom(room, { type: 'poll_updated', poll: room.activePoll });
              }
              break;
          }
          break;
        }

        case 'vote_poll': {
          if (!currentRoomId || !currentParticipantId) return;
          const room = rooms.get(currentRoomId);
          if (!room || !room.activePoll || room.activePoll.isClosed) return;

          const { optionId } = message;
          const poll = room.activePoll;
          const previousVote = poll.voters[currentParticipantId];

          if (previousVote) {
            const prevOpt = poll.options.find(o => o.id === previousVote);
            if (prevOpt) prevOpt.votes = Math.max(0, prevOpt.votes - 1);
          }

          poll.voters[currentParticipantId] = optionId;
          const newOpt = poll.options.find(o => o.id === optionId);
          if (newOpt) newOpt.votes += 1;

          broadcastToRoom(room, { type: 'poll_updated', poll: room.activePoll });
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && currentParticipantId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        const participant = room.participants.get(currentParticipantId);
        if (participant) {
          const logEntry = room.attendanceLog.find(l => l.id === currentParticipantId && !l.leftAt);
          if (logEntry) logEntry.leftAt = Date.now();
        }
        room.participants.delete(currentParticipantId);
        broadcastToRoom(room, {
          type: 'peer_left',
          participantId: currentParticipantId
        });
      }
    }
  });
});

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`CipherClass server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
