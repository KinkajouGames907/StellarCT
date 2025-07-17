// Real-time Voice Chat with Firebase WebRTC Signaling
// This will be included in the main script

// WebRTC Configuration
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Voice Chat State
let currentCallId = null;
let callListener = null;
let remoteStreams = {};

// Create or join voice call in Firebase
async function createOrJoinVoiceCall() {
    try {
        const callId = `${currentServer}_${currentChannel}`;
        currentCallId = callId;
        
        if (!isDemoMode) {
            // Check if call already exists
            const callDoc = await db.collection('voiceCalls').doc(callId).get();
            
            if (callDoc.exists) {
                // Join existing call
                await joinExistingCall(callId);
            } else {
                // Create new call
                await createNewCall(callId);
            }
            
            // Listen for other participants
            listenForCallParticipants(callId);
        } else {
            // Demo mode - simulate call
            simulateDemoCall();
        }
        
        showNotification('Voice call started! 🎤', 'success');
        
    } catch (error) {
        console.error('Error creating/joining voice call:', error);
        showNotification('Failed to start voice call: ' + error.message, 'error');
    }
}

// Create new voice call
async function createNewCall(callId) {
    const callData = {
        id: callId,
        channelId: currentServer,
        channelName: currentChannel,
        createdBy: currentUser.uid,
        createdByUsername: currentUser.username,
        participants: [{
            uid: currentUser.uid,
            username: currentUser.username,
            joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'connected'
        }],
        status: 'active',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('voiceCalls').doc(callId).set(callData);
    console.log('Created new voice call:', callId);
}

// Join existing voice call
async function joinExistingCall(callId) {
    const participantData = {
        uid: currentUser.uid,
        username: currentUser.username,
        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'connected'
    };
    
    await db.collection('voiceCalls').doc(callId).update({
        participants: firebase.firestore.FieldValue.arrayUnion(participantData)
    });
    
    console.log('Joined existing voice call:', callId);
}

// Listen for call participants
function listenForCallParticipants(callId) {
    if (callListener) {
        callListener();
    }
    
    callListener = db.collection('voiceCalls').doc(callId).onSnapshot(async (doc) => {
        if (doc.exists) {
            const callData = doc.data();
            const participants = callData.participants || [];
            
            // Update participants list
            voiceCallParticipants = participants.map(p => p.username);
            updateCallParticipants();
            
            // Handle new participants (WebRTC peer connections)
            for (const participant of participants) {
                if (participant.uid !== currentUser.uid && !peerConnections[participant.uid]) {
                    await createPeerConnection(participant.uid, participant.username);
                }
            }
            
            console.log('Call participants updated:', voiceCallParticipants);
        }
    });
}

// Create WebRTC peer connection
async function createPeerConnection(participantId, participantUsername) {
    try {
        const peerConnection = new RTCPeerConnection(rtcConfig);
        peerConnections[participantId] = peerConnection;
        
        // Add local stream to peer connection
        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
        }
        
        // Handle remote stream
        peerConnection.ontrack = (event) => {
            console.log('Received remote stream from:', participantUsername);
            const remoteStream = event.streams[0];
            remoteStreams[participantId] = remoteStream;
            
            // Create audio element for remote stream
            const audioElement = document.createElement('audio');
            audioElement.srcObject = remoteStream;
            audioElement.autoplay = true;
            audioElement.muted = isDeafened;
            audioElement.id = `audio-${participantId}`;
            audioElement.style.display = 'none';
            document.body.appendChild(audioElement);
            
            showNotification(`${participantUsername} connected to voice chat! 🎤`, 'info');
        };
        
        // Handle ICE candidates
        peerConnection.onicecandidate = async (event) => {
            if (event.candidate) {
                await db.collection('voiceCalls').doc(currentCallId)
                    .collection('candidates').add({
                        candidate: event.candidate.toJSON(),
                        from: currentUser.uid,
                        to: participantId,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
            }
        };
        
        // Create offer for new participant
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        // Send offer through Firebase
        await db.collection('voiceCalls').doc(currentCallId)
            .collection('offers').doc(`${currentUser.uid}_${participantId}`).set({
                offer: offer,
                from: currentUser.uid,
                to: participantId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
        console.log('Created peer connection for:', participantUsername);
        
    } catch (error) {
        console.error('Error creating peer connection:', error);
    }
}

// Listen for WebRTC offers and answers
function listenForWebRTCSignaling() {
    if (!currentCallId) return;
    
    // Listen for offers
    db.collection('voiceCalls').doc(currentCallId).collection('offers')
        .where('to', '==', currentUser.uid)
        .onSnapshot(async (snapshot) => {
            for (const doc of snapshot.docs) {
                const data = doc.data();
                if (!peerConnections[data.from]) {
                    await handleOffer(data.from, data.offer);
                }
            }
        });
    
    // Listen for answers
    db.collection('voiceCalls').doc(currentCallId).collection('answers')
        .where('to', '==', currentUser.uid)
        .onSnapshot(async (snapshot) => {
            for (const doc of snapshot.docs) {
                const data = doc.data();
                const peerConnection = peerConnections[data.from];
                if (peerConnection) {
                    await peerConnection.setRemoteDescription(data.answer);
                }
            }
        });
    
    // Listen for ICE candidates
    db.collection('voiceCalls').doc(currentCallId).collection('candidates')
        .where('to', '==', currentUser.uid)
        .onSnapshot(async (snapshot) => {
            for (const doc of snapshot.docs) {
                const data = doc.data();
                const peerConnection = peerConnections[data.from];
                if (peerConnection) {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            }
        });
}

// Handle incoming offer
async function handleOffer(fromUserId, offer) {
    try {
        const peerConnection = new RTCPeerConnection(rtcConfig);
        peerConnections[fromUserId] = peerConnection;
        
        // Add local stream
        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
        }
        
        // Handle remote stream
        peerConnection.ontrack = (event) => {
            const remoteStream = event.streams[0];
            remoteStreams[fromUserId] = remoteStream;
            
            const audioElement = document.createElement('audio');
            audioElement.srcObject = remoteStream;
            audioElement.autoplay = true;
            audioElement.muted = isDeafened;
            audioElement.id = `audio-${fromUserId}`;
            audioElement.style.display = 'none';
            document.body.appendChild(audioElement);
        };
        
        // Handle ICE candidates
        peerConnection.onicecandidate = async (event) => {
            if (event.candidate) {
                await db.collection('voiceCalls').doc(currentCallId)
                    .collection('candidates').add({
                        candidate: event.candidate.toJSON(),
                        from: currentUser.uid,
                        to: fromUserId,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
            }
        };
        
        // Set remote description and create answer
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        // Send answer
        await db.collection('voiceCalls').doc(currentCallId)
            .collection('answers').doc(`${currentUser.uid}_${fromUserId}`).set({
                answer: answer,
                from: currentUser.uid,
                to: fromUserId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
    } catch (error) {
        console.error('Error handling offer:', error);
    }
}

// Enhanced leave call function
async function leaveVoiceCall() {
    try {
        // Stop local stream
        if (localStream) {
            localStream.getTracks().forEach(track => {
                track.stop();
            });
            localStream = null;
        }
        
        // Remove remote audio elements
        Object.keys(remoteStreams).forEach(participantId => {
            const audioElement = document.getElementById(`audio-${participantId}`);
            if (audioElement) {
                audioElement.remove();
            }
        });
        
        // Close all peer connections
        Object.values(peerConnections).forEach(pc => {
            pc.close();
        });
        peerConnections = {};
        remoteStreams = {};
        
        // Remove from Firebase call
        if (!isDemoMode && currentCallId) {
            const callDoc = await db.collection('voiceCalls').doc(currentCallId).get();
            if (callDoc.exists) {
                const callData = callDoc.data();
                const updatedParticipants = callData.participants.filter(p => p.uid !== currentUser.uid);
                
                if (updatedParticipants.length === 0) {
                    // Delete call if no participants left
                    await db.collection('voiceCalls').doc(currentCallId).delete();
                } else {
                    // Update participants list
                    await db.collection('voiceCalls').doc(currentCallId).update({
                        participants: updatedParticipants
                    });
                }
            }
        }
        
        // Stop listening
        if (callListener) {
            callListener();
            callListener = null;
        }
        
        // Reset state
        isInVoiceCall = false;
        isMuted = false;
        isDeafened = false;
        voiceCallParticipants = [];
        currentCallId = null;
        
        showNotification('Left voice call', 'info');
        
    } catch (error) {
        console.error('Error leaving call:', error);
        showNotification('Error leaving call', 'error');
    }
}

// Demo mode simulation
function simulateDemoCall() {
    // Add demo users gradually
    const demoParticipants = ['alice_dev', 'bob_coder', 'diana_react'];
    let delay = 2000;
    
    demoParticipants.forEach((username, index) => {
        setTimeout(() => {
            if (isInVoiceCall) {
                voiceCallParticipants.push(username);
                updateCallParticipants();
                showNotification(`${username} joined the call`, 'info');
            }
        }, delay + (index * 1500));
    });
}

console.log('Real-time voice chat system loaded! 🎤🔥');