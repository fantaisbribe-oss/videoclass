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
      whiteboardData: [],
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
