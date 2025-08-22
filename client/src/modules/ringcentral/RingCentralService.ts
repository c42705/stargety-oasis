import {
  RingCentralConfig,
  RingCentralUser,
  RingCentralMeeting,
  RingCentralParticipant,
  RingCentralCallState,
  RingCentralSDKMethods
} from './types';

// Mock RingCentral Service for demonstration
export class RingCentralService implements RingCentralSDKMethods {
  private config: RingCentralConfig;
  private currentUser: RingCentralUser | null = null;
  private callState: RingCentralCallState;
  private eventCallbacks: Map<string, Function[]> = new Map();
  private mockEventInterval: NodeJS.Timeout | null = null;
  private isMockMode: boolean = true; // Set to false for real SDK integration

  constructor(config: RingCentralConfig) {
    this.config = config;
    this.callState = this.getInitialCallState();
  }

  private getInitialCallState(): RingCentralCallState {
    return {
      isConnected: false,
      isInCall: false,
      participants: [],
      controls: {
        audioEnabled: true,
        videoEnabled: true,
        screenShareEnabled: false,
        recordingEnabled: false,
        chatEnabled: true,
      },
    };
  }

  // Authentication Methods
  async login(credentials: { username: string; password: string }): Promise<RingCentralUser> {
    if (this.isMockMode) {
      // Mock login simulation
      await this.delay(1000);
      this.currentUser = {
        id: 'mock-user-' + Date.now(),
        name: credentials.username,
        email: `${credentials.username}@company.com`,
        extensionNumber: '101',
        avatar: `https://ui-avatars.com/api/?name=${credentials.username}&background=007bff&color=fff`,
      };
      this.callState.isConnected = true;
      this.notifyStateChange();
      return this.currentUser;
    } else {
      // Real RingCentral SDK integration would go here
      throw new Error('Real RingCentral SDK not implemented yet');
    }
  }

  async logout(): Promise<void> {
    if (this.isMockMode) {
      await this.delay(500);
      this.currentUser = null;
      this.callState = this.getInitialCallState();
      this.stopMockEvents();
      this.notifyStateChange();
    }
  }

  // Meeting Management
  async createInstantMeeting(topic: string): Promise<RingCentralMeeting> {
    if (!this.currentUser) throw new Error('User not logged in');

    if (this.isMockMode) {
      await this.delay(800);
      const meeting: RingCentralMeeting = {
        id: 'meeting-' + Date.now(),
        topic,
        meetingType: 'Instant',
        status: 'NotStarted',
        startTime: new Date(),
        hostId: this.currentUser.id,
        participants: [],
        joinUri: `https://meetings.ringcentral.com/j/${Date.now()}`,
        password: Math.random().toString(36).substring(2, 8),
      };
      return meeting;
    } else {
      throw new Error('Real RingCentral SDK not implemented yet');
    }
  }

  async joinMeeting(meetingId: string, password?: string): Promise<void> {
    if (!this.currentUser) throw new Error('User not logged in');

    if (this.isMockMode) {
      await this.delay(1500);

      // Create mock meeting
      const meeting: RingCentralMeeting = {
        id: meetingId,
        topic: 'Mock Video Call',
        meetingType: 'Instant',
        status: 'Started',
        startTime: new Date(),
        hostId: this.currentUser.id,
        participants: [],
        joinUri: `https://meetings.ringcentral.com/j/${meetingId}`,
        password,
      };

      // Create local participant
      const localParticipant: RingCentralParticipant = {
        id: this.currentUser.id,
        name: this.currentUser.name,
        email: this.currentUser.email,
        role: 'Host',
        status: 'Connected',
        audioMuted: false,
        videoMuted: false,
        isScreenSharing: false,
        joinTime: new Date(),
      };

      this.callState.isInCall = true;
      this.callState.currentMeeting = meeting;
      this.callState.localParticipant = localParticipant;
      this.callState.participants = [localParticipant];

      this.notifyStateChange();
      this.startMockEvents();

      // Trigger call started event
      this.triggerEvent('callStateChanged', this.callState);
    }
  }

  async leaveMeeting(): Promise<void> {
    if (this.isMockMode) {
      await this.delay(500);
      this.stopMockEvents();
      this.callState.isInCall = false;
      this.callState.currentMeeting = undefined;
      this.callState.localParticipant = undefined;
      this.callState.participants = [];
      this.notifyStateChange();
    }
  }

  // Call Controls
  async toggleAudio(): Promise<void> {
    if (this.isMockMode && this.callState.localParticipant) {
      await this.delay(200);
      this.callState.localParticipant.audioMuted = !this.callState.localParticipant.audioMuted;
      this.callState.controls.audioEnabled = !this.callState.localParticipant.audioMuted;
      this.notifyStateChange();
      this.triggerEvent('participantAudioToggled', {
        participantId: this.callState.localParticipant.id,
        muted: this.callState.localParticipant.audioMuted,
      });
    }
  }

  async toggleVideo(): Promise<void> {
    if (this.isMockMode && this.callState.localParticipant) {
      await this.delay(200);
      this.callState.localParticipant.videoMuted = !this.callState.localParticipant.videoMuted;
      this.callState.controls.videoEnabled = !this.callState.localParticipant.videoMuted;
      this.notifyStateChange();
      this.triggerEvent('participantVideoToggled', {
        participantId: this.callState.localParticipant.id,
        muted: this.callState.localParticipant.videoMuted,
      });
    }
  }

  async startScreenShare(): Promise<void> {
    if (this.isMockMode && this.callState.localParticipant) {
      await this.delay(800);
      this.callState.localParticipant.isScreenSharing = true;
      this.callState.controls.screenShareEnabled = true;
      this.notifyStateChange();
    }
  }

  async stopScreenShare(): Promise<void> {
    if (this.isMockMode && this.callState.localParticipant) {
      await this.delay(300);
      this.callState.localParticipant.isScreenSharing = false;
      this.callState.controls.screenShareEnabled = false;
      this.notifyStateChange();
    }
  }

  // Event Handlers
  onParticipantJoined(callback: (participant: RingCentralParticipant) => void): void {
    this.addEventListener('participantJoined', callback);
  }

  onParticipantLeft(callback: (participantId: string) => void): void {
    this.addEventListener('participantLeft', callback);
  }

  onCallStateChanged(callback: (state: RingCentralCallState) => void): void {
    this.addEventListener('callStateChanged', callback);
  }

  // Utility Methods
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private addEventListener(event: string, callback: Function): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  private triggerEvent(event: string, data: any): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  private notifyStateChange(): void {
    this.triggerEvent('callStateChanged', this.callState);
  }

  // Mock Event Simulation
  private startMockEvents(): void {
    if (!this.isMockMode) return;

    this.mockEventInterval = setInterval(() => {
      this.simulateRandomEvent();
    }, 5000 + Math.random() * 10000); // Random events every 5-15 seconds
  }

  private stopMockEvents(): void {
    if (this.mockEventInterval) {
      clearInterval(this.mockEventInterval);
      this.mockEventInterval = null;
    }
  }

  private simulateRandomEvent(): void {
    if (!this.callState.isInCall) return;

    const events = ['participant_joined', 'participant_left'];
    const randomEvent = events[Math.floor(Math.random() * events.length)];

    switch (randomEvent) {
      case 'participant_joined':
        this.simulateParticipantJoined();
        break;
      case 'participant_left':
        this.simulateParticipantLeft();
        break;
    }
  }

  private simulateParticipantJoined(): void {
    const mockNames = ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson', 'Emma Brown'];
    const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];

    // Don't add if already exists
    if (this.callState.participants.some(p => p.name === randomName)) return;

    const newParticipant: RingCentralParticipant = {
      id: 'mock-participant-' + Date.now(),
      name: randomName,
      email: `${randomName.toLowerCase().replace(' ', '.')}@company.com`,
      role: 'Participant',
      status: 'Connected',
      audioMuted: Math.random() > 0.7,
      videoMuted: Math.random() > 0.8,
      isScreenSharing: false,
      joinTime: new Date(),
    };

    this.callState.participants.push(newParticipant);
    this.notifyStateChange();
    this.triggerEvent('participantJoined', newParticipant);
  }

  private simulateParticipantLeft(): void {
    const nonHostParticipants = this.callState.participants.filter(p => p.role !== 'Host');
    if (nonHostParticipants.length === 0) return;

    const randomIndex = Math.floor(Math.random() * nonHostParticipants.length);
    const leavingParticipant = nonHostParticipants[randomIndex];

    this.callState.participants = this.callState.participants.filter(p => p.id !== leavingParticipant.id);
    this.notifyStateChange();
    this.triggerEvent('participantLeft', leavingParticipant.id);
  }

  // Public getters
  getCurrentUser(): RingCentralUser | null {
    return this.currentUser;
  }

  getCallState(): RingCentralCallState {
    return { ...this.callState };
  }

  isLoggedIn(): boolean {
    return this.currentUser !== null && this.callState.isConnected;
  }
}
