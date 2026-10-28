/**
 * CipherClass - Secure End-to-End Encrypted Virtual Classroom
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { TopBar } from './components/TopBar';
import { VideoGrid } from './components/VideoGrid';
import { ControlsBar } from './components/ControlsBar';
import { Whiteboard } from './components/Whiteboard';
import { DocumentCollab } from './components/DocumentCollab';
import { ScreenShareStage } from './components/ScreenShareStage';
import { ChatDrawer } from './components/ChatDrawer';
import { SecurityModal } from './components/SecurityModal';
import { TeacherHostModal } from './components/TeacherHostModal';
import { PollModal } from './components/PollModal';
import { JoinLobby } from './components/JoinLobby';
import { GitHubModal } from './components/GitHubModal';
import { ClassroomService } from './lib/classroomService';
import {
  Participant,
  ChatMessage,
  WhiteboardElement,
  Poll,
  AttendanceRecord,
  MainViewMode,
  UserRole,
  ReactionBurst,
} from './types';
import {
  deriveKeyFromPassphrase,
  generateRoomKey,
  exportKey,
  importKey,
  encryptData,
  decryptData,
  computeSafetyNumber,
} from './lib/crypto';

export default function App() {
  const [inCall, setInCall] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<MainViewMode>('stage');
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [securityModalOpen, setSecurityModalOpen] = useState<boolean>(false);
  const [hostToolsOpen, setHostToolsOpen] = useState<boolean>(false);
  const [pollModalOpen, setPollModalOpen] = useState<boolean>(false);
  const [githubModalOpen, setGithubModalOpen] = useState<boolean>(false);

  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const urlRoom = searchParams.get('room');
  const isInvitedStudent = Boolean(urlRoom);

  // User credentials
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(isInvitedStudent ? 'student' : 'teacher');
  const [currentUserName, setCurrentUserName] = useState<string>(isInvitedStudent ? 'Guest Student' : 'Dr. Elena Vance');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>(urlRoom || 'optics-301');
  const [roomName, setRoomName] = useState<string>('Physics 301 - Wave Optics & Quantum Mechanics');

  // Encryption keys & verification
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [roomKeyBase64, setRoomKeyBase64] = useState<string>('');
  const [safetyNumber, setSafetyNumber] = useState<string>('');
  const [fingerprint, setFingerprint] = useState<string>('');

  // Media streams & statuses
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [handRaised, setHandRaised] = useState<boolean>(false);
  const [spotlightId, setSpotlightId] = useState<string | null>(null);

  // Classroom state
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [allowStudentScreenshare, setAllowStudentScreenshare] = useState<boolean>(true);
  const [allowStudentWhiteboard, setAllowStudentWhiteboard] = useState<boolean>(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init-1',
      senderId: 'inst-elena',
      senderName: 'Dr. Elena Vance',
      senderRole: 'teacher',
      text: "Good morning class! Welcome to Lecture 14 on Wave Optics. All audio, video, and notes in this room are E2E encrypted.",
      timestamp: Date.now() - 900000,
      isEncrypted: true,
      wireSample: {
        iv: 'v4fL72m8K0xQ',
        ciphertext: '8d2a1b9f4e6c3820a1bc7e829fa0c2...',
      },
    },
    {
      id: 'msg-init-2',
      senderId: 'stu-sarah',
      senderName: 'Sarah Chen',
      senderRole: 'student',
      text: 'Good morning Dr. Vance! Does increasing the slit separation d make the bright fringes closer together on the screen?',
      timestamp: Date.now() - 600000,
      isEncrypted: true,
      wireSample: {
        iv: 'k90xLa47MzQ1',
        ciphertext: '5a10ef4b9821d374a2cc9b148fa710...',
      },
    },
    {
      id: 'msg-init-3',
      senderId: 'inst-elena',
      senderName: 'Dr. Elena Vance',
      senderRole: 'teacher',
      text: 'Precisely, Sarah! Because fringe spacing is β = λD / d, as d increases, the spacing β is inversely proportional and gets narrower.',
      timestamp: Date.now() - 300000,
      isEncrypted: true,
      wireSample: {
        iv: 'm82Lk18P0zWq',
        ciphertext: '3f92bb40a827cf119a08eb197cda04...',
      },
    },
    {
      id: 'msg-init-4',
      senderId: 'stu-david',
      senderName: 'David Kim',
      senderRole: 'student',
      text: 'I just imported the Python simulation script from GitHub into our shared lesson notes!',
      timestamp: Date.now() - 120000,
      isEncrypted: true,
      wireSample: {
        iv: 'w982La72XoP4',
        ciphertext: '12cf88019a2e4b77dcba19028a4cb9...',
      },
    },
  ]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [whiteboardElements, setWhiteboardElements] = useState<WhiteboardElement[]>([]);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [attendanceLog, setAttendanceLog] = useState<AttendanceRecord[]>([]);
  const [reactions, setReactions] = useState<ReactionBurst[]>([]);

  const [userAvatar, setUserAvatar] = useState<string | undefined>(undefined);

  // WebSocket and Firebase references
  const wsRef = useRef<WebSocket | null>(null);
  const classroomServiceRef = useRef<ClassroomService | null>(null);

  // Connect to WebSocket and initialize room
  const handleJoinClassroom = async (config: {
    name: string;
    role: UserRole;
    roomId: string;
    roomName: string;
    passphrase?: string;
    isMuted: boolean;
    isCameraOff: boolean;
    avatar?: string;
  }) => {
    setCurrentUserName(config.name);
    setCurrentUserRole(config.role);
    setRoomId(config.roomId);
    setRoomName(config.roomName);
    setIsMuted(config.isMuted);
    setIsCameraOff(config.isCameraOff);
    if (config.avatar) {
      setUserAvatar(config.avatar);
    }

    const generatedId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setCurrentUserId(generatedId);

    // 1. Initialize Cryptographic Keys using WebCrypto
    let key: CryptoKey;
    const urlHash = window.location.hash;
    if (urlHash.startsWith('#key=') && urlHash.length > 5) {
      const keyStr = urlHash.replace('#key=', '');
      key = await importKey(keyStr);
    } else if (config.passphrase) {
      key = await deriveKeyFromPassphrase(config.passphrase, config.roomId);
    } else {
      key = await generateRoomKey();
    }

    const exportedBase64 = await exportKey(key);
    const { safetyNumber: sn, fingerprint: fp } = await computeSafetyNumber(key, config.roomId);

    setCryptoKey(key);
    setRoomKeyBase64(exportedBase64);
    setSafetyNumber(sn);
    setFingerprint(fp);

    // Update URL hash silently without HTTP reload (zero-knowledge)
    window.location.hash = `key=${exportedBase64}`;

    // 2. Request Local Video/Audio Stream
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        // Set initial track states
        stream.getAudioTracks().forEach((t) => (t.enabled = !config.isMuted));
        stream.getVideoTracks().forEach((t) => (t.enabled = !config.isCameraOff));
        setLocalStream(stream);
      }
    } catch (err) {
      console.warn('Camera/mic access warning:', err);
    }

    // 3. Initialize Firebase ClassroomService
    const classroomService = new ClassroomService(config.roomId, generatedId);
    classroomServiceRef.current = classroomService;
    if (localStream) {
      classroomService.setLocalStream(localStream);
    }

    const participantData: Participant = {
      id: generatedId,
      name: config.name,
      role: config.role,
      avatar:
        config.avatar ||
        (config.role === 'teacher'
          ? '/src/assets/images/avatar_teacher_elena_1793021711754.jpg'
          : undefined),
      isMuted: config.isMuted,
      isCameraOff: config.isCameraOff,
      isScreenSharing: false,
      handRaised: false,
      joinedAt: Date.now(),
      keyFingerprint: fp,
    };

    classroomService.joinRoom(participantData, config.roomName);
    classroomService.subscribeToRoomState(
      (roomData) => {
        if (roomData.name) setRoomName(roomData.name);
        if (roomData.isLocked !== undefined) setIsLocked(roomData.isLocked);
        if (roomData.allowStudentScreenshare !== undefined)
          setAllowStudentScreenshare(roomData.allowStudentScreenshare);
        if (roomData.allowStudentWhiteboard !== undefined)
          setAllowStudentWhiteboard(roomData.allowStudentWhiteboard);
        if (roomData.activeView) setActiveView(roomData.activeView);
        if (roomData.spotlightParticipantId !== undefined)
          setSpotlightId(roomData.spotlightParticipantId);
      },
      (parts) => {
        if (parts && parts.length > 0) {
          setParticipants(parts);
        }
      }
    );
    classroomService.subscribeToWhiteboard((elements) => {
      if (elements && elements.length > 0) setWhiteboardElements(elements);
    });
    classroomService.subscribeToDocument((content) => {
      if (content) setDocumentContent(content);
    });
    classroomService.subscribeToMessages(async (rawMsg) => {
      let decryptedText = rawMsg.text;
      if (rawMsg.wireSample?.iv && rawMsg.wireSample?.ciphertext && key) {
        try {
          const decrypted = await decryptData(key, {
            iv: rawMsg.wireSample.iv,
            ciphertext: rawMsg.wireSample.ciphertext,
            timestamp: rawMsg.timestamp,
          });
          decryptedText = decrypted.text;
        } catch {
          decryptedText = '[Encrypted Message: Decryption Failed]';
        }
      }
      setMessages((prev) => {
        if (prev.some((m) => m.id === rawMsg.id)) return prev;
        return [...prev, { ...rawMsg, text: decryptedText }];
      });
    });
    classroomService.subscribeToPolls((poll) => {
      if (poll) setActivePoll(poll);
    });
    classroomService.initWebRTCSignaling((peerId, remoteMediaStream) => {
      console.log('Received remote WebRTC media stream from peer:', peerId, remoteMediaStream);
    });

    // 4. Connect to WebSocket Server (Dual-Bridge Resilience)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send join message
      ws.send(
        JSON.stringify({
          type: 'join_room',
          roomId: config.roomId,
          roomName: config.roomName,
          participantId: generatedId,
          name: config.name,
          role: config.role,
          avatar:
            config.avatar ||
            (config.role === 'teacher'
              ? '/src/assets/images/avatar_teacher_elena_1793021711754.jpg'
              : undefined),
          isMuted: config.isMuted,
          isCameraOff: config.isCameraOff,
          keyFingerprint: fp,
        })
      );
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'room_state': {
            setRoomName(data.roomName);
            setIsLocked(data.isLocked);
            setAllowStudentScreenshare(data.allowStudentScreenshare);
            setAllowStudentWhiteboard(data.allowStudentWhiteboard);
            setWhiteboardElements(data.whiteboardData || []);
            setDocumentContent(data.documentContent || '');
            setActivePoll(data.activePoll || null);
            setAttendanceLog(data.attendanceLog || []);

            // Set participants list (add mock classmates if not present for rich classroom experience)
            const incomingPeers: Participant[] = data.participants || [];
            const hasElena = incomingPeers.some((p) => p.name.includes('Dr. Elena Vance'));
            const hasSarah = incomingPeers.some((p) => p.name.includes('Sarah Chen'));
            const hasDavid = incomingPeers.some((p) => p.name.includes('David Kim'));

            const classPeers: Participant[] = [...incomingPeers];
            if (!hasElena && config.role === 'student') {
              classPeers.unshift({
                id: 'inst-elena',
                name: 'Dr. Elena Vance (Instructor)',
                role: 'teacher',
                avatar: '/src/assets/images/avatar_teacher_elena_1793021711754.jpg',
                isMuted: false,
                isCameraOff: false,
                joinedAt: Date.now() - 1200000,
              });
            }
            if (!hasSarah && config.name !== 'Sarah Chen') {
              classPeers.push({
                id: 'stu-sarah',
                name: 'Sarah Chen',
                role: 'student',
                isMuted: true,
                isCameraOff: false,
                handRaised: false,
                joinedAt: Date.now() - 900000,
              });
            }
            if (!hasDavid && config.name !== 'David Kim') {
              classPeers.push({
                id: 'stu-david',
                name: 'David Kim',
                role: 'student',
                isMuted: true,
                isCameraOff: false,
                handRaised: true, // Example student with raised hand
                joinedAt: Date.now() - 600000,
              });
            }

            setParticipants(classPeers);
            break;
          }

          case 'peer_joined': {
            setParticipants((prev) => {
              if (prev.some((p) => p.id === data.participant.id)) return prev;
              return [...prev, data.participant];
            });
            break;
          }

          case 'peer_left': {
            setParticipants((prev) => prev.filter((p) => p.id !== data.participantId));
            break;
          }

          case 'participant_updated': {
            setParticipants((prev) =>
              prev.map((p) => (p.id === data.participantId ? { ...p, ...data.updates } : p))
            );
            break;
          }

          case 'encrypted_chat_message': {
            const rawMsg = data.message;
            let decryptedText = rawMsg.text;
            if (rawMsg.encryptedPacket && key) {
              try {
                const decrypted = await decryptData(key, rawMsg.encryptedPacket);
                decryptedText = decrypted.text;
              } catch (e) {
                decryptedText = '[Encrypted Message: Decryption Failed]';
              }
            }

            const newMsg: ChatMessage = {
              id: rawMsg.id,
              senderId: rawMsg.senderId,
              senderName: rawMsg.senderName,
              senderRole: rawMsg.senderRole,
              text: decryptedText,
              timestamp: rawMsg.timestamp,
              isEncrypted: true,
              wireSample: rawMsg.encryptedPacket
                ? {
                    iv: rawMsg.encryptedPacket.iv,
                    ciphertext: rawMsg.encryptedPacket.ciphertext.substring(0, 32) + '...',
                  }
                : undefined,
            };

            setMessages((prev) => [...prev, newMsg]);
            if (!chatOpen) {
              setUnreadCount((c) => c + 1);
            }
            break;
          }

          case 'whiteboard_sync': {
            setWhiteboardElements(data.whiteboardData || []);
            break;
          }

          case 'document_sync': {
            setDocumentContent(data.documentContent || '');
            break;
          }

          case 'view_switched': {
            setActiveView(data.view);
            break;
          }

          case 'reaction_burst': {
            const burst: ReactionBurst = {
              id: `rx-${Date.now()}-${Math.random()}`,
              emoji: data.emoji,
              senderName: data.senderName,
              x: Math.floor(Math.random() * 60) + 20, // 20% to 80%
              y: Math.floor(Math.random() * 40) + 40,
            };
            setReactions((prev) => [...prev, burst]);
            setTimeout(() => {
              setReactions((prev) => prev.filter((r) => r.id !== burst.id));
            }, 2500);
            break;
          }

          case 'poll_updated': {
            setActivePoll(data.poll);
            break;
          }

          case 'mute_all_enforced': {
            if (config.role === 'student') {
              setIsMuted(true);
              if (localStream) {
                localStream.getAudioTracks().forEach((t) => (t.enabled = false));
              }
            }
            break;
          }

          case 'room_lock_changed': {
            setIsLocked(data.isLocked);
            break;
          }

          case 'permissions_changed': {
            if (data.allowStudentScreenshare !== undefined)
              setAllowStudentScreenshare(data.allowStudentScreenshare);
            if (data.allowStudentWhiteboard !== undefined)
              setAllowStudentWhiteboard(data.allowStudentWhiteboard);
            break;
          }

          case 'spotlight_changed': {
            setSpotlightId(data.spotlightParticipantId);
            break;
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    setInCall(true);
  };

  // Toggle Microphone
  const handleToggleMic = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = !nextState));
    }
    classroomServiceRef.current?.updateStatus({ isMuted: nextState });
    wsRef.current?.send(
      JSON.stringify({
        type: 'update_status',
        isMuted: nextState,
      })
    );
  };

  // Toggle Camera
  const handleToggleCamera = () => {
    const nextState = !isCameraOff;
    setIsCameraOff(nextState);
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = !nextState));
    }
    classroomServiceRef.current?.updateStatus({ isCameraOff: nextState });
    wsRef.current?.send(
      JSON.stringify({
        type: 'update_status',
        isCameraOff: nextState,
      })
    );
  };

  // Toggle Screen Share
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
      setActiveView('stage');
      classroomServiceRef.current?.updateStatus({ isScreenSharing: false });
      wsRef.current?.send(
        JSON.stringify({
          type: 'update_status',
          isScreenSharing: false,
        })
      );
    } else {
      // Start screen sharing
      try {
        if (navigator.mediaDevices?.getDisplayMedia) {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
          });
          setScreenStream(displayStream);
          setIsScreenSharing(true);
          setActiveView('screenshare');

          displayStream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
            setScreenStream(null);
            setActiveView('stage');
            classroomServiceRef.current?.updateStatus({ isScreenSharing: false });
          };
        } else {
          // Switch directly to presentation deck
          setIsScreenSharing(true);
          setActiveView('screenshare');
        }

        classroomServiceRef.current?.updateStatus({ isScreenSharing: true });
        wsRef.current?.send(
          JSON.stringify({
            type: 'update_status',
            isScreenSharing: true,
          })
        );
      } catch (err) {
        console.warn('Screen share cancelled or permission denied:', err);
        // Switch to interactive presentation deck anyway so the teacher can showcase diagrams!
        setIsScreenSharing(true);
        setActiveView('screenshare');
      }
    }
  };

  // Toggle Student Hand
  const handleToggleHand = () => {
    const nextHand = !handRaised;
    setHandRaised(nextHand);
    classroomServiceRef.current?.updateStatus({ handRaised: nextHand });
    wsRef.current?.send(
      JSON.stringify({
        type: 'update_status',
        handRaised: nextHand,
      })
    );
  };

  // Send Encrypted Chat Message
  const handleSendMessage = async (text: string) => {
    if (!cryptoKey) return;

    // Encrypt payload client-side before sending
    const encryptedPacket = await encryptData(cryptoKey, { text });

    const messagePayload = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: currentUserRole,
      timestamp: Date.now(),
      encryptedPacket,
    };

    // Send through Firebase Firestore (zero plaintext leaks)
    classroomServiceRef.current?.sendEncryptedMessage({
      id: messagePayload.id,
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: currentUserRole,
      iv: encryptedPacket.iv,
      ciphertext: encryptedPacket.ciphertext,
    });

    // Send through WebSocket (dual-bridge resilience)
    wsRef.current?.send(
      JSON.stringify({
        type: 'encrypted_chat_message',
        message: messagePayload,
      })
    );
  };

  // Send Reaction Burst
  const handleSendReaction = (emoji: string) => {
    wsRef.current?.send(
      JSON.stringify({
        type: 'reaction_burst',
        emoji,
        senderName: currentUserName,
      })
    );
  };

  // Whiteboard changes handler
  const handleWhiteboardChange = (elements: WhiteboardElement[]) => {
    setWhiteboardElements(elements);
    classroomServiceRef.current?.syncWhiteboard(elements);
    wsRef.current?.send(
      JSON.stringify({
        type: 'whiteboard_sync',
        whiteboardData: elements,
      })
    );
  };

  // Document changes handler
  const handleDocumentChange = (newContent: string) => {
    setDocumentContent(newContent);
    classroomServiceRef.current?.syncDocument(newContent, currentUserName);
    wsRef.current?.send(
      JSON.stringify({
        type: 'document_sync',
        documentContent: newContent,
        senderName: currentUserName,
      })
    );
  };

  // View mode switcher
  const handleViewChange = (view: MainViewMode) => {
    setActiveView(view);
    classroomServiceRef.current?.updateRoom({ activeView: view });
    wsRef.current?.send(
      JSON.stringify({
        type: 'switch_view',
        view,
      })
    );
  };

  // Teacher Host Actions
  const handleMuteAll = () => {
    wsRef.current?.send(
      JSON.stringify({
        type: 'teacher_action',
        action: 'mute_all',
      })
    );
  };

  const handleToggleLock = (locked: boolean) => {
    setIsLocked(locked);
    classroomServiceRef.current?.updateRoom({ isLocked: locked });
    wsRef.current?.send(
      JSON.stringify({
        type: 'teacher_action',
        action: 'toggle_lock',
        isLocked: locked,
      })
    );
  };

  const handleToggleStudentScreen = (allowed: boolean) => {
    setAllowStudentScreenshare(allowed);
    classroomServiceRef.current?.updateRoom({ allowStudentScreenshare: allowed });
    wsRef.current?.send(
      JSON.stringify({
        type: 'teacher_action',
        action: 'toggle_student_screen',
        allowed,
      })
    );
  };

  const handleToggleStudentWhiteboard = (allowed: boolean) => {
    setAllowStudentWhiteboard(allowed);
    classroomServiceRef.current?.updateRoom({ allowStudentWhiteboard: allowed });
    wsRef.current?.send(
      JSON.stringify({
        type: 'teacher_action',
        action: 'toggle_student_whiteboard',
        allowed,
      })
    );
  };

  const handleSpotlight = (id: string | null) => {
    setSpotlightId(id);
    classroomServiceRef.current?.updateRoom({ spotlightParticipantId: id });
    wsRef.current?.send(
      JSON.stringify({
        type: 'teacher_action',
        action: 'spotlight_speaker',
        spotlightId: id,
      })
    );
  };

  const handleLowerStudentHand = (studentId: string) => {
    wsRef.current?.send(
      JSON.stringify({
        type: 'teacher_action',
        action: 'lower_student_hand',
        targetId: studentId,
      })
    );
  };

  const handleCreatePoll = (question: string, options: string[]) => {
    const newPoll: Poll = {
      id: `poll-${Date.now()}`,
      question,
      options: options.map((opt, i) => ({ id: `opt-${i}`, text: opt, votes: 0 })),
      voters: {},
      isClosed: false,
      createdBy: currentUserId,
      createdAt: Date.now(),
    };
    classroomServiceRef.current?.savePoll(newPoll);
    wsRef.current?.send(
      JSON.stringify({
        type: 'teacher_action',
        action: 'create_poll',
        question,
        options,
      })
    );
    setPollModalOpen(true);
  };

  const handleVotePoll = (optionId: string) => {
    if (activePoll) {
      classroomServiceRef.current?.votePoll(activePoll.id, optionId);
    }
    wsRef.current?.send(
      JSON.stringify({
        type: 'vote_poll',
        optionId,
      })
    );
  };

  const handleClosePoll = () => {
    if (activePoll) {
      classroomServiceRef.current?.savePoll({ ...activePoll, isClosed: true });
    }
    wsRef.current?.send(
      JSON.stringify({
        type: 'teacher_action',
        action: 'close_poll',
      })
    );
  };

  // Leave Classroom
  const handleLeaveCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
    }
    classroomServiceRef.current?.leaveRoom();
    wsRef.current?.close();
    setInCall(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach((t) => t.stop());
      screenStream?.getTracks().forEach((t) => t.stop());
      classroomServiceRef.current?.leaveRoom();
      wsRef.current?.close();
    };
  }, []);

  if (!inCall) {
    return (
      <JoinLobby
        onJoin={handleJoinClassroom}
        defaultRoomId={roomId}
        defaultKeyHash={window.location.hash}
        defaultRole={currentUserRole}
        defaultName={currentUserName}
      />
    );
  }

  const localParticipant: Participant = {
    id: currentUserId,
    name: currentUserName,
    role: currentUserRole,
    avatar:
      userAvatar ||
      (currentUserRole === 'teacher'
        ? '/src/assets/images/avatar_teacher_elena_1793021711754.jpg'
        : undefined),
    isMuted,
    isCameraOff,
    isScreenSharing,
    handRaised,
    joinedAt: Date.now(),
    keyFingerprint: fingerprint,
  };

  const raisedHandsCount = participants.filter((p) => p.handRaised).length;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Reaction Floating Bursts */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {reactions.map((r) => (
          <div
            key={r.id}
            style={{ left: `${r.x}%`, top: `${r.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-out fade-out slide-out-to-top-12 duration-1000"
          >
            <span className="text-4xl drop-shadow-lg animate-bounce">{r.emoji}</span>
            <span className="text-[10px] bg-slate-900/80 text-slate-300 px-2 py-0.5 rounded-full mt-1 border border-slate-700">
              {r.senderName}
            </span>
          </div>
        ))}
      </div>

      {/* Top Bar adhering to Section 2 Top Bar Contract */}
      <TopBar
        roomName={roomName}
        roomId={roomId}
        userRole={currentUserRole}
        userName={currentUserName}
        activeView={activeView}
        onViewChange={handleViewChange}
        onOpenSecurity={() => setSecurityModalOpen(true)}
        onOpenHostTools={() => setHostToolsOpen(true)}
        onOpenGitHub={() => setGithubModalOpen(true)}
        participantCount={participants.length + 1}
        isLocked={isLocked}
      />

      {/* Main Classroom Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {activeView === 'stage' && (
            <VideoGrid
              localStream={localStream}
              localParticipant={localParticipant}
              participants={participants}
              spotlightId={spotlightId}
              currentUserRole={currentUserRole}
              onToggleSpotlight={handleSpotlight}
              onLowerHand={handleLowerStudentHand}
            />
          )}

          {activeView === 'whiteboard' && (
            <Whiteboard
              elements={whiteboardElements}
              onElementsChange={handleWhiteboardChange}
              currentUserRole={currentUserRole}
              currentUserId={currentUserId}
              allowStudentWhiteboard={allowStudentWhiteboard}
            />
          )}

          {activeView === 'document' && (
            <DocumentCollab
              content={documentContent}
              onContentChange={handleDocumentChange}
              currentUserRole={currentUserRole}
              currentUserName={currentUserName}
            />
          )}

          {activeView === 'screenshare' && (
            <ScreenShareStage
              screenStream={screenStream}
              presenterName={isScreenSharing ? `${currentUserName} (You)` : 'Dr. Elena Vance'}
              isLocalSharing={isScreenSharing}
              onStopScreenShare={handleToggleScreenShare}
              currentUserRole={currentUserRole}
            />
          )}
        </main>

        {/* Encrypted Side Drawer Chat */}
        <ChatDrawer
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          messages={messages}
          onSendMessage={handleSendMessage}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
      </div>

      {/* Bottom Floating Controls Bar */}
      <ControlsBar
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isScreenSharing={isScreenSharing}
        handRaised={handRaised}
        userRole={currentUserRole}
        activeView={activeView}
        chatOpen={chatOpen}
        unreadCount={unreadCount}
        raisedHandsCount={raisedHandsCount}
        onToggleMic={handleToggleMic}
        onToggleCamera={handleToggleCamera}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleHand={handleToggleHand}
        onToggleChat={() => {
          setChatOpen(!chatOpen);
          if (!chatOpen) setUnreadCount(0);
        }}
        onViewChange={handleViewChange}
        onOpenSecurity={() => setSecurityModalOpen(true)}
        onOpenHostTools={() => setHostToolsOpen(true)}
        onOpenPoll={() => setPollModalOpen(true)}
        onSendReaction={handleSendReaction}
        onLeaveCall={handleLeaveCall}
      />

      {/* Security E2EE Modal */}
      <SecurityModal
        isOpen={securityModalOpen}
        onClose={() => setSecurityModalOpen(false)}
        safetyNumber={safetyNumber}
        fingerprint={fingerprint}
        roomKeyBase64={roomKeyBase64}
        roomId={roomId}
      />

      {/* Teacher Host Control Modal */}
      <TeacherHostModal
        isOpen={hostToolsOpen}
        onClose={() => setHostToolsOpen(false)}
        isLocked={isLocked}
        allowStudentScreenshare={allowStudentScreenshare}
        allowStudentWhiteboard={allowStudentWhiteboard}
        participants={participants}
        attendanceLog={attendanceLog}
        onMuteAll={handleMuteAll}
        onToggleLock={handleToggleLock}
        onToggleStudentScreen={handleToggleStudentScreen}
        onToggleStudentWhiteboard={handleToggleStudentWhiteboard}
        onLowerHand={handleLowerStudentHand}
        onSpotlightStudent={(id) => {
          handleSpotlight(id);
          setHostToolsOpen(false);
        }}
        onCreatePoll={handleCreatePoll}
      />

      {/* Classroom Poll Modal */}
      <PollModal
        isOpen={pollModalOpen}
        onClose={() => setPollModalOpen(false)}
        poll={activePoll}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        onVote={handleVotePoll}
        onClosePoll={handleClosePoll}
      />

      {/* GitHub Repository & Live Link Modal */}
      <GitHubModal
        isOpen={githubModalOpen}
        onClose={() => setGithubModalOpen(false)}
        sharedAppUrl="https://ais-pre-pjt3i2ehwk6vpxnoxzbbnc-127082696976.europe-west1.run.app"
      />
    </div>
  );
}
