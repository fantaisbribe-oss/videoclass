export type UserRole = 'teacher' | 'student';

export type MainViewMode = 'stage' | 'whiteboard' | 'document' | 'screenshare';

export interface Participant {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  handRaised?: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isScreenSharing?: boolean;
  joinedAt: number;
  keyFingerprint?: string;
  audioLevel?: number; // 0 to 1 for visual mic pulse
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: number;
  isEncrypted: boolean;
  wireSample?: {
    iv: string;
    ciphertext: string;
  };
}

export interface Point {
  x: number;
  y: number;
}

export type WhiteboardTool = 'pen' | 'highlighter' | 'eraser' | 'rectangle' | 'circle' | 'arrow' | 'text';

export interface WhiteboardElement {
  id: string;
  tool: WhiteboardTool;
  color: string;
  strokeWidth: number;
  points: Point[];
  text?: string;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  userId: string;
  timestamp: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  voters: Record<string, string>; // participantId -> optionId
  isClosed: boolean;
  createdBy: string;
  createdAt?: number;
}

export interface AttendanceRecord {
  id: string;
  name: string;
  role: string;
  joinedAt: number;
  leftAt?: number;
}

export interface ReactionBurst {
  id: string;
  emoji: string;
  senderName: string;
  x: number;
  y: number;
}
