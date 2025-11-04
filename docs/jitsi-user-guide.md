# Jitsi Video Conferencing - User Guide

## Overview
Stargety Oasis now features automatic video conferencing powered by Jitsi Meet. When you walk your character into designated meeting areas on the map, you'll automatically join a video call with other users in that area. When you leave the area, you'll automatically disconnect from the call.

---

## Getting Started

### 1. Enable Jitsi Video Service

**For Administrators:**
1. Click the **Settings** icon in the top navigation
2. Scroll to **Admin Settings** section
3. Under **Video Calling Service**, select **Jitsi Meet**
4. Click **Save Changes**

The Jitsi service is now enabled for all users in your organization.

### 2. Configure Jitsi Server (Optional)

**For Administrators:**
1. In Settings, ensure **Jitsi Meet** is selected
2. You'll see a **Jitsi Server Configuration** section
3. Enter your custom Jitsi server URL (e.g., `meet.stargety.com`)
   - Do NOT include `https://` or trailing slashes
   - Default: `meet.stargety.com`
   - Public option: `meet.jit.si` (free, no setup required)
4. Click **Save Changes**

---

## Using Auto-Join Video Calls

### Automatic Join
1. **Navigate your character** on the map using arrow keys or WASD
2. **Walk into a meeting area** (highlighted zones on the map)
3. **Video call automatically starts** within 1-2 seconds
4. **Video panel opens** showing the Jitsi interface
5. **You're connected!** Other users in the same area will see you

### Automatic Leave
1. **Walk out of the meeting area**
2. **Video call automatically ends** after 500ms delay
3. **Video panel closes** or shows "Not in a call"

### Sticky Mode (Optional)
If you want to continue a call after leaving an area:

1. **Enable Sticky Mode** by clicking the pushpin icon in the video panel
2. **Walk out of the area**
3. **Confirmation modal appears** asking:
   - "Leave Call" - Disconnect from the video call
   - "Stay Connected" - Continue the call even outside the area
4. **Choose your preference**

When sticky mode is active and you're in a call:
- The pushpin icon is highlighted
- You can manually leave the call using the "Leave Call" button
- Walking into a different meeting area will prompt you to switch rooms

---

## Video Call Controls

### Jitsi Interface
Once connected, you'll see the standard Jitsi Meet interface with:

- **Microphone toggle** - Mute/unmute your audio
- **Camera toggle** - Turn your video on/off
- **Screen share** - Share your screen with participants
- **Chat** - Send text messages to participants
- **Participants list** - See who's in the call
- **Settings** - Adjust audio/video settings
- **Leave call** - Manually disconnect (or just walk out of the area)

### Connection Quality Indicator
The video panel shows your connection quality:
- 🟢 **Good** - Excellent connection (70-100%)
- 🟡 **Medium** - Fair connection (30-70%)
- 🔴 **Poor** - Weak connection (0-30%)

### Participant Count
The video panel displays the number of participants in the current call.

---

## Meeting Areas

### What are Meeting Areas?
Meeting areas are designated zones on the map where video calls are automatically triggered. They are typically:
- Conference rooms
- Meeting spaces
- Collaboration zones
- Social areas

### Visual Indicators
Meeting areas are usually highlighted with:
- Colored overlays (semi-transparent)
- Labels showing the area name
- Icons indicating video call capability

### Room Names
Each meeting area is mapped to a Jitsi room. By default:
- Room names are auto-generated from area IDs
- Format: `stargety-{area-id}`
- Example: Area "meeting-room" → Jitsi room "stargety-meeting-room"

Administrators can customize room names in the Map Editor.

---

## Troubleshooting

### Video Call Not Starting
**Problem**: You entered a meeting area but the video call didn't start.

**Solutions**:
1. **Check video service**: Ensure Jitsi is selected in Settings
2. **Check permissions**: Allow camera/microphone access in your browser
3. **Check connection**: Ensure you have internet connectivity
4. **Wait a moment**: Auto-join has a 500ms delay to prevent rapid switches
5. **Refresh the page**: Sometimes a refresh helps
6. **Check console**: Open browser console (F12) for error messages

### Connection Retry
If the initial connection fails, the system will automatically retry:
- **Retry 1**: After 1 second
- **Retry 2**: After 2 seconds
- **Retry 3**: After 4 seconds

You'll see retry status messages in the video panel.

### Poor Connection Quality
**Problem**: Video is laggy or audio is choppy.

**Solutions**:
1. **Check your internet**: Run a speed test
2. **Close other apps**: Free up bandwidth
3. **Turn off video**: Use audio-only mode
4. **Move closer to router**: Improve WiFi signal
5. **Use wired connection**: Ethernet is more stable than WiFi

### Can't Hear/See Others
**Problem**: Other participants can't hear or see you.

**Solutions**:
1. **Check microphone**: Ensure it's not muted in Jitsi
2. **Check camera**: Ensure it's enabled in Jitsi
3. **Check browser permissions**: Allow camera/microphone access
4. **Check device settings**: Ensure correct mic/camera selected in Jitsi settings
5. **Test in another app**: Verify hardware works outside Jitsi

### Stuck in a Call
**Problem**: You left the area but the call didn't end.

**Solutions**:
1. **Check sticky mode**: Disable the pushpin icon if active
2. **Manual leave**: Click "Leave Call" button in video panel
3. **Refresh page**: Force disconnect by reloading
4. **Check area boundaries**: Ensure you fully exited the area

---

## Privacy & Security

### Camera & Microphone Permissions
- Jitsi requires camera and microphone access
- Your browser will prompt for permission on first use
- You can revoke permissions anytime in browser settings
- You can mute/disable camera in Jitsi controls

### Data Privacy
- Video/audio streams are encrypted end-to-end
- No recordings are stored by default
- Jitsi Meet is open-source and privacy-focused
- Custom Jitsi servers provide additional privacy control

### Who Can Join?
- Only users in the same meeting area can join the call
- Room names are predictable (based on area IDs)
- For private meetings, use custom room names (admin feature)
- Consider using Jitsi's password protection for sensitive calls

---

## Advanced Features (Admin Only)

### Custom Room Mappings
Administrators can customize which Jitsi room each area connects to:

1. **Open Map Editor**
2. **Click "Jitsi Rooms" tab** (Video icon)
3. **View all area-to-room mappings**
4. **Add/Edit/Delete mappings**:
   - Click "Add Mapping" to create custom mapping
   - Click Edit icon to modify existing mapping
   - Click Delete icon to remove custom mapping (reverts to auto-generated)
5. **Import/Export**:
   - Export mappings as JSON for backup
   - Import mappings from JSON file
   - Clear all mappings to reset to defaults

### Analytics & Monitoring
Administrators can monitor call quality and usage:

**View Analytics in Browser Console:**
```javascript
// Get summary statistics
jitsiAnalyticsService.getSummary()

// View all call sessions
jitsiAnalyticsService.getAllSessions()

// View sessions for specific room
jitsiAnalyticsService.getSessionsByRoom('meeting-room')

// Export analytics data
console.log(jitsiAnalyticsService.exportData())
```

**Analytics Data Includes:**
- Total sessions
- Total call duration
- Average session duration
- Total errors
- Quality distribution (good/medium/poor)
- Per-session details (participants, quality events, errors)

---

## Tips & Best Practices

### For Users
1. **Test your setup**: Join a test area before important meetings
2. **Use headphones**: Prevent echo and feedback
3. **Mute when not speaking**: Reduce background noise
4. **Good lighting**: Position yourself facing a light source
5. **Stable internet**: Use wired connection for important calls
6. **Close unnecessary tabs**: Free up browser resources

### For Administrators
1. **Custom server**: Use your own Jitsi server for better control
2. **Meaningful room names**: Use descriptive names for meeting areas
3. **Monitor analytics**: Check for connection issues and quality problems
4. **Regular backups**: Export room mappings periodically
5. **User training**: Educate users on auto-join/leave behavior
6. **Test before rollout**: Verify configuration with test users

---

## Keyboard Shortcuts (Jitsi)

While in a video call, you can use these Jitsi shortcuts:
- **M** - Toggle microphone mute
- **V** - Toggle video on/off
- **D** - Toggle screen sharing
- **C** - Open/close chat
- **R** - Raise hand
- **T** - Open settings
- **Space** - Push to talk (hold to unmute temporarily)

---

## FAQ

**Q: Can I use Jitsi and RingCentral at the same time?**
A: No, you must choose one video service in Settings. The selection applies to all users.

**Q: What happens if I walk through multiple areas quickly?**
A: The system has a 500ms debounce delay to prevent rapid room switches. You'll only join the area you stay in for more than 500ms.

**Q: Can I manually join a Jitsi room without entering an area?**
A: Not currently. Auto-join is tied to map areas. Future versions may add manual room joining.

**Q: How many people can join a Jitsi call?**
A: Jitsi supports 50+ participants, but quality degrades with more users. Recommended: 10-15 for best experience.

**Q: Can I record calls?**
A: Jitsi supports recording, but it must be enabled on the server. Contact your administrator.

**Q: What browsers are supported?**
A: Jitsi works best on Chrome, Firefox, Edge, and Safari (latest versions). Mobile browsers are also supported.

**Q: Can I use Jitsi on mobile?**
A: Yes, Jitsi works in mobile browsers. For best experience, use the Jitsi Meet mobile app.

---

## Support

For technical issues or questions:
1. Check this user guide
2. Check browser console for error messages (F12)
3. Contact your system administrator
4. Visit Jitsi documentation: https://jitsi.github.io/handbook/

---

**Last Updated**: 2025-11-04
**Version**: 1.0.0

