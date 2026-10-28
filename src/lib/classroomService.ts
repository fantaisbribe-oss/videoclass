/**
 * Firebase Classroom Service
 * Handles Firestore real-time synchronization, presence, and WebRTC peer-to-peer signaling.
 */

import {
  db,
  auth,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  deleteDoc,
  addDoc,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  Participant,
  ChatMessage,
  WhiteboardElement,
  Poll,
  AttendanceRecord,
  UserRole,
} from '../types';

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ],
};

export class ClassroomService {
  private roomId: string;
  private currentUserId: string;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private localStream: MediaStream | null = null;
  private unsubscribers: (() => void)[] = [];

  constructor(roomId: string, currentUserId: string) {
    this.roomId = roomId;
    this.currentUserId = currentUserId;
  }

  setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    // Add tracks to any existing peer connections
    if (stream) {
      this.peerConnections.forEach((pc) => {
        const senders = pc.getSenders();
        stream.getTracks().forEach((track) => {
          const sender = senders.find((s) => s.track?.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track);
          } else {
            pc.addTrack(track, stream);
          }
        });
      });
    }
  }

  // 1. Join Classroom Room & Set Presence
  async joinRoom(participant: Participant, roomName: string): Promise<void> {
    const roomRef = doc(db, 'rooms', this.roomId);

    try {
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) {
        await setDoc(roomRef, {
          id: this.roomId,
          name: roomName,
          teacherId: participant.role === 'teacher' ? participant.id : 'instructor-default',
          teacherName: participant.role === 'teacher' ? participant.name : 'Dr. Elena Vance',
          isLocked: false,
          allowStudentScreenshare: true,
          allowStudentWhiteboard: true,
          activeView: 'stage',
          spotlightParticipantId: null,
          createdAt: new Date().toISOString(),
        });
      }

      // Add presence in participants subcollection
      const participantRef = doc(db, 'rooms', this.roomId, 'participants', this.currentUserId);
      await setDoc(participantRef, {
        id: participant.id,
        name: participant.name,
        role: participant.role,
        avatar: participant.avatar || null,
        handRaised: participant.handRaised || false,
        isMuted: participant.isMuted || false,
        isCameraOff: participant.isCameraOff || false,
        isScreenSharing: participant.isScreenSharing || false,
        keyFingerprint: participant.keyFingerprint || null,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
      });

      // Add attendance log
      const attendanceRef = doc(db, 'rooms', this.roomId, 'attendance', this.currentUserId);
      await setDoc(attendanceRef, {
        id: this.currentUserId,
        participantId: this.currentUserId,
        name: participant.name,
        role: participant.role,
        joinedAt: Date.now(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `rooms/${this.roomId}`);
    }
  }

  // 2. Listen to Room State
  subscribeToRoomState(
    onRoomUpdate: (roomData: any) => void,
    onParticipantsUpdate: (participants: Participant[]) => void
  ) {
    const roomRef = doc(db, 'rooms', this.roomId);
    const unsubRoom = onSnapshot(
      roomRef,
      (snap) => {
        if (snap.exists()) {
          onRoomUpdate(snap.data());
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `rooms/${this.roomId}`)
    );
    this.unsubscribers.push(unsubRoom);

    const partsRef = collection(db, 'rooms', this.roomId, 'participants');
    const unsubParts = onSnapshot(
      partsRef,
      (snapshot) => {
        const list: Participant[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as Participant);
        });
        onParticipantsUpdate(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `rooms/${this.roomId}/participants`)
    );
    this.unsubscribers.push(unsubParts);
  }

  // 3. Update Participant Status
  async updateStatus(updates: Partial<Participant>) {
    try {
      const pRef = doc(db, 'rooms', this.roomId, 'participants', this.currentUserId);
      await updateDoc(pRef, updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${this.roomId}/participants/${this.currentUserId}`);
    }
  }

  // 4. Encrypted Chat Subscription & Dispatch
  subscribeToMessages(onNewMessage: (msg: ChatMessage) => void) {
    const msgsRef = collection(db, 'rooms', this.roomId, 'messages');
    const unsub = onSnapshot(
      msgsRef,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            onNewMessage({
              id: data.id,
              senderId: data.senderId,
              senderName: data.senderName,
              senderRole: data.senderRole,
              text: data.text || '',
              timestamp: data.timestamp,
              isEncrypted: true,
              wireSample: {
                iv: data.iv,
                ciphertext: data.ciphertext,
              },
            });
          }
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `rooms/${this.roomId}/messages`)
    );
    this.unsubscribers.push(unsub);
  }

  async sendEncryptedMessage(msg: {
    id: string;
    senderId: string;
    senderName: string;
    senderRole: UserRole;
    iv: string;
    ciphertext: string;
  }) {
    try {
      const msgRef = doc(db, 'rooms', this.roomId, 'messages', msg.id);
      await setDoc(msgRef, {
        ...msg,
        timestamp: Date.now(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `rooms/${this.roomId}/messages/${msg.id}`);
    }
  }

  // 5. Whiteboard Sync
  subscribeToWhiteboard(onWhiteboardUpdate: (elements: WhiteboardElement[]) => void) {
    const wbRef = doc(db, 'rooms', this.roomId, 'whiteboard', 'canvas_state');
    const unsub = onSnapshot(
      wbRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.data) {
            try {
              const parsed = JSON.parse(data.data);
              onWhiteboardUpdate(parsed);
            } catch (e) {}
          }
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `rooms/${this.roomId}/whiteboard/canvas_state`)
    );
    this.unsubscribers.push(unsub);
  }

  async syncWhiteboard(elements: WhiteboardElement[]) {
    try {
      const wbRef = doc(db, 'rooms', this.roomId, 'whiteboard', 'canvas_state');
      await setDoc(wbRef, {
        id: 'canvas_state',
        data: JSON.stringify(elements),
        updatedBy: this.currentUserId,
        updatedAt: Date.now(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `rooms/${this.roomId}/whiteboard/canvas_state`);
    }
  }

  // 6. Collaborative Document Sync
  subscribeToDocument(onDocumentUpdate: (content: string, authorName?: string) => void) {
    const docRef = doc(db, 'rooms', this.roomId, 'document', 'lesson_notes');
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          onDocumentUpdate(data.content || '', data.updatedByName);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `rooms/${this.roomId}/document/lesson_notes`)
    );
    this.unsubscribers.push(unsub);
  }

  async syncDocument(content: string, authorName: string) {
    try {
      const docRef = doc(db, 'rooms', this.roomId, 'document', 'lesson_notes');
      await setDoc(docRef, {
        id: 'lesson_notes',
        content,
        updatedBy: this.currentUserId,
        updatedByName: authorName,
        updatedAt: Date.now(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `rooms/${this.roomId}/document/lesson_notes`);
    }
  }

  // 7. Room State Management (Lock, Spotlight, Views)
  async updateRoom(updates: Record<string, any>) {
    try {
      const roomRef = doc(db, 'rooms', this.roomId);
      await updateDoc(roomRef, updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${this.roomId}`);
    }
  }

  // 8. Poll Management
  async savePoll(poll: Poll) {
    try {
      const pollRef = doc(db, 'rooms', this.roomId, 'polls', poll.id);
      await setDoc(pollRef, poll);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `rooms/${this.roomId}/polls/${poll.id}`);
    }
  }

  async votePoll(pollId: string, optionId: string) {
    try {
      const voteRef = doc(db, 'rooms', this.roomId, 'polls', pollId, 'votes', this.currentUserId);
      await setDoc(voteRef, {
        pollId,
        optionId,
        voterId: this.currentUserId,
        timestamp: Date.now(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `rooms/${this.roomId}/polls/${pollId}/votes/${this.currentUserId}`);
    }
  }

  subscribeToPolls(onPollUpdate: (poll: Poll | null) => void) {
    const pollsRef = collection(db, 'rooms', this.roomId, 'polls');
    const unsub = onSnapshot(
      pollsRef,
      (snapshot) => {
        let latestPoll: Poll | null = null;
        snapshot.forEach((d) => {
          const poll = d.data() as Poll;
          const pollTime = poll.createdAt || 0;
          const latestTime = latestPoll?.createdAt || 0;
          if (!latestPoll || pollTime > latestTime) {
            latestPoll = poll;
          }
        });
        if (latestPoll) {
          onPollUpdate(latestPoll);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `rooms/${this.roomId}/polls`)
    );
    this.unsubscribers.push(unsub);
  }

  // 9. WebRTC P2P Signaling Mechanism
  initWebRTCSignaling(onRemoteStream: (peerId: string, stream: MediaStream) => void) {
    const sigRef = collection(db, 'rooms', this.roomId, 'signaling');
    const unsub = onSnapshot(
      sigRef,
      async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            // Process message if intended for this user
            if (data.targetId === this.currentUserId && data.senderId !== this.currentUserId) {
              const peerId = data.senderId;
              let pc = this.peerConnections.get(peerId);

              if (data.type === 'offer') {
                if (!pc) {
                  pc = this.createPeerConnection(peerId, onRemoteStream);
                }
                const offerDesc = new RTCSessionDescription(JSON.parse(data.data));
                await pc.setRemoteDescription(offerDesc);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                // Send back answer
                await addDoc(sigRef, {
                  id: `sig-${Date.now()}-${Math.random()}`,
                  senderId: this.currentUserId,
                  targetId: peerId,
                  type: 'answer',
                  data: JSON.stringify(answer),
                  timestamp: Date.now(),
                });
              } else if (data.type === 'answer' && pc) {
                const answerDesc = new RTCSessionDescription(JSON.parse(data.data));
                await pc.setRemoteDescription(answerDesc);
              } else if (data.type === 'candidate' && pc) {
                try {
                  const candidate = new RTCIceCandidate(JSON.parse(data.data));
                  await pc.addIceCandidate(candidate);
                } catch (e) {
                  console.warn('Error adding ICE candidate:', e);
                }
              }

              // Cleanup consumed signaling document
              deleteDoc(change.doc.ref).catch(() => {});
            }
          }
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `rooms/${this.roomId}/signaling`)
    );
    this.unsubscribers.push(unsub);
  }

  // Create WebRTC Peer Connection to target peer
  createPeerConnection(peerId: string, onRemoteStream: (peerId: string, stream: MediaStream) => void): RTCPeerConnection {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnections.set(peerId, pc);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(collection(db, 'rooms', this.roomId, 'signaling'), {
          id: `sig-${Date.now()}-${Math.random()}`,
          senderId: this.currentUserId,
          targetId: peerId,
          type: 'candidate',
          data: JSON.stringify(event.candidate),
          timestamp: Date.now(),
        }).catch(() => {});
      }
    };

    // Remote Track handler
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        onRemoteStream(peerId, event.streams[0]);
      }
    };

    return pc;
  }

  // Call peer by sending an offer
  async callPeer(peerId: string, onRemoteStream: (peerId: string, stream: MediaStream) => void) {
    const pc = this.createPeerConnection(peerId, onRemoteStream);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await addDoc(collection(db, 'rooms', this.roomId, 'signaling'), {
      id: `sig-${Date.now()}-${Math.random()}`,
      senderId: this.currentUserId,
      targetId: peerId,
      type: 'offer',
      data: JSON.stringify(offer),
      timestamp: Date.now(),
    });
  }

  // Clean up and leave
  leaveRoom() {
    this.unsubscribers.forEach((u) => u());
    this.unsubscribers = [];
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    // Remove presence
    const pRef = doc(db, 'rooms', this.roomId, 'participants', this.currentUserId);
    deleteDoc(pRef).catch(() => {});
  }
}
