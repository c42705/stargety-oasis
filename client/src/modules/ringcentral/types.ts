// RingCentral Video SDK Types and Interfaces

export interface RingCentralConfig {
  clientId: string;
  clientSecret: string;
  server: string;
  redirectUri: string;
}

export interface RingCentralUser {
  id: string;
  name: string;
  email: string;
  extensionNumber?: string;
  avatar?: string;
}

export interface RingCentralMeeting {
  id: string;
  topic: string;
  meetingType: 'Instant' | 'Scheduled' | 'PMI';
  status: 'NotStarted' | 'Started' | 'Finished';
  startTime?: Date;
  duration?: number;
  hostId: string;
  participants: RingCentralParticipant[];
  joinUri: string;
  password?: string;
}

export interface RingCentralParticipant {
  id: string;
  name: string;
  email?: string;
  role: 'Host' | 'CoHost' | 'Participant';
  status: 'Connected' | 'Disconnected' | 'Connecting';
  audioMuted: boolean;
  videoMuted: boolean;
  isScreenSharing: boolean;
  joinTime?: Date;
}

export interface CallControls {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenShareEnabled: boolean;
  recordingEnabled: boolean;
  chatEnabled: boolean;
}

export interface RingCentralCallState {
  isConnected: boolean;
  isInCall: boolean;
  currentMeeting?: RingCentralMeeting;
  localParticipant?: RingCentralParticipant;
  participants: RingCentralParticipant[];
  controls: CallControls;
  error?: string;
}

// Mock/Simulation Types
export interface MockCallEvent {
  type: 'participant_joined' | 'participant_left' | 'call_started' | 'call_ended' | 'audio_toggled' | 'video_toggled';
  participantId?: string;
  participantName?: string;
  timestamp: Date;
}

export interface RingCentralSDKMethods {
  // Authentication
  login(credentials: { username: string; password: string }): Promise<RingCentralUser>;
  logout(): Promise<void>;

  // Meeting Management
  createInstantMeeting(topic: string): Promise<RingCentralMeeting>;
  joinMeeting(meetingId: string, password?: string): Promise<void>;
  leaveMeeting(): Promise<void>;

  // Call Controls
  toggleAudio(): Promise<void>;
  toggleVideo(): Promise<void>;
  startScreenShare(): Promise<void>;
  stopScreenShare(): Promise<void>;

  // Event Handlers
  onParticipantJoined(callback: (participant: RingCentralParticipant) => void): void;
  onParticipantLeft(callback: (participantId: string) => void): void;
  onCallStateChanged(callback: (state: RingCentralCallState) => void): void;
}

// Event Bus Integration Types
export interface RingCentralEventData {
  'ringcentral:callStarted': { meetingId: string; participants: RingCentralParticipant[] };
  'ringcentral:callEnded': { meetingId: string; duration: number };
  'ringcentral:participantJoined': { participant: RingCentralParticipant };
  'ringcentral:participantLeft': { participantId: string; participantName: string };
  'ringcentral:audioToggled': { participantId: string; muted: boolean };
  'ringcentral:videoToggled': { participantId: string; muted: boolean };
  'ringcentral:error': { error: string; code?: string };
}
