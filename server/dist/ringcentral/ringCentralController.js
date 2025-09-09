"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RingCentralController = void 0;
// In-memory storage for RingCentral calls
const activeCalls = new Map();
const callParticipants = new Map();
const userSockets = new Map(); // userId -> socketId
class RingCentralController {
    constructor(io) {
        this.io = io;
    }
    // Handle call started event
    handleCallStarted(socket, data) {
        const { callId, hostId, topic } = data;
        const call = {
            id: callId,
            hostId,
            participants: [hostId],
            startTime: new Date(),
            status: 'active',
            topic,
        };
        activeCalls.set(callId, call);
        callParticipants.set(callId, []);
        userSockets.set(hostId, socket.id);
        // Join socket room for this call
        socket.join(`ringcentral-call-${callId}`);
        // Broadcast call started to other users
        socket.broadcast.emit('ringcentral-call-started', {
            callId,
            hostId,
            topic,
            startTime: call.startTime,
        });
        console.log(`RingCentral call started: ${callId} by ${hostId}`);
    }
    // Handle participant joining call
    handleParticipantJoined(socket, data) {
        const { callId, participantId, participantName } = data;
        const call = activeCalls.get(callId);
        if (!call) {
            socket.emit('ringcentral-error', { message: 'Call not found' });
            return;
        }
        // Add participant to call
        if (!call.participants.includes(participantId)) {
            call.participants.push(participantId);
        }
        const participant = {
            id: participantId,
            name: participantName,
            callId,
            joinedAt: new Date(),
            audioMuted: false,
            videoMuted: false,
        };
        const participants = callParticipants.get(callId) || [];
        participants.push(participant);
        callParticipants.set(callId, participants);
        userSockets.set(participantId, socket.id);
        // Join socket room for this call
        socket.join(`ringcentral-call-${callId}`);
        // Broadcast participant joined to call room
        this.io.to(`ringcentral-call-${callId}`).emit('ringcentral-participant-joined', {
            callId,
            participant: {
                id: participant.id,
                name: participant.name,
                joinedAt: participant.joinedAt,
            },
        });
        console.log(`Participant ${participantName} joined RingCentral call: ${callId}`);
    }
    // Handle call ended
    handleCallEnded(socket, data) {
        const { callId } = data;
        this.endCall(callId);
    }
    // Handle user disconnect
    handleDisconnect(socket) {
        // Find user by socket ID and remove from all calls
        for (const [userId, socketId] of userSockets.entries()) {
            if (socketId === socket.id) {
                // Find all calls this user is in
                for (const [callId, call] of activeCalls.entries()) {
                    if (call.participants.includes(userId)) {
                        this.handleParticipantLeft(socket, { callId, participantId: userId });
                    }
                }
                userSockets.delete(userId);
                break;
            }
        }
    }
    // Handle participant leaving call
    handleParticipantLeft(socket, data) {
        const { callId, participantId } = data;
        const call = activeCalls.get(callId);
        if (!call)
            return;
        // Remove participant from call
        call.participants = call.participants.filter(p => p !== participantId);
        const participants = callParticipants.get(callId) || [];
        const participantIndex = participants.findIndex(p => p.id === participantId);
        if (participantIndex !== -1) {
            const participant = participants[participantIndex];
            participants.splice(participantIndex, 1);
            callParticipants.set(callId, participants);
            // Leave socket room
            socket.leave(`ringcentral-call-${callId}`);
            userSockets.delete(participantId);
            // Broadcast participant left to call room
            this.io.to(`ringcentral-call-${callId}`).emit('ringcentral-participant-left', {
                callId,
                participantId,
                participantName: participant.name,
            });
            console.log(`Participant ${participant.name} left RingCentral call: ${callId}`);
        }
        // End call if no participants left
        if (call.participants.length === 0) {
            this.endCall(callId);
        }
    }
    // Private method to end a call
    endCall(callId) {
        const call = activeCalls.get(callId);
        if (!call)
            return;
        call.status = 'ended';
        // Notify all participants
        this.io.to(`ringcentral-call-${callId}`).emit('ringcentral-call-ended', {
            callId,
            duration: Date.now() - call.startTime.getTime(),
        });
        // Clean up
        activeCalls.delete(callId);
        callParticipants.delete(callId);
        // Remove all participants from socket room
        this.io.in(`ringcentral-call-${callId}`).socketsLeave(`ringcentral-call-${callId}`);
        console.log(`RingCentral call ended: ${callId}`);
    }
    // API endpoints
    getActiveCall(callId) {
        const call = activeCalls.get(callId);
        if (!call)
            return null;
        const participants = callParticipants.get(callId) || [];
        return {
            ...call,
            participants: participants.map(p => ({
                id: p.id,
                name: p.name,
                joinedAt: p.joinedAt,
                audioMuted: p.audioMuted,
                videoMuted: p.videoMuted,
            })),
        };
    }
    getAllActiveCalls() {
        return Array.from(activeCalls.values()).map(call => ({
            id: call.id,
            hostId: call.hostId,
            topic: call.topic,
            participantCount: call.participants.length,
            startTime: call.startTime,
            status: call.status,
        }));
    }
}
exports.RingCentralController = RingCentralController;
