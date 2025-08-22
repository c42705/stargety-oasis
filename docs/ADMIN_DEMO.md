# 🔧 Stargety Oasis Login & Admin Demo Guide

## 🚀 **Getting Started with Login**

### **Login Screen Overview**
When you first open the application at `http://localhost:3000`, you'll see a professional login screen with the Stargety Oasis branding. The login system supports both predefined test accounts and custom credentials for demo purposes.

### **Test Accounts Available**

#### **👑 Admin Accounts (Full Access)**
| Username | Password | Display Name | Features |
|----------|----------|--------------|----------|
| `admin` | `admin123` | Administrator | Full access including Settings tab |
| `administrator` | `admin123` | System Administrator | Full access including Settings tab |
| `mike.admin` | `admin789` | Mike Admin | Full access including Settings tab |

#### **👤 Regular User Accounts**
| Username | Password | Display Name | Features |
|----------|----------|--------------|----------|
| `john.doe` | `user123` | John Doe | Chat, Video, Virtual World access |
| `jane.smith` | `user456` | Jane Smith | Chat, Video, Virtual World access |
| `sarah.wilson` | `user789` | Sarah Wilson | Chat, Video, Virtual World access |

### **🔐 Login Process**

1. **Open the Application:**
   - Navigate to `http://localhost:3000`
   - You'll see the login screen with the Stargety Oasis logo

2. **Choose Your Login Method:**

   **Option A: Use Demo Accounts (Recommended)**
   - Click "🔽 Demo Accounts" to expand the test accounts section
   - Click "Use Account" next to any test account to auto-fill credentials
   - Click "🚀 Sign In" to login

   **Option B: Manual Login**
   - Enter any username and password (demo mode accepts any combination)
   - Optionally specify a Room ID (defaults to "general")
   - Check "Remember my username" to save username for next session
   - Click "🚀 Sign In" to login

3. **Admin Detection:**
   - Users with usernames containing "admin", "administrator", or "root" get admin privileges
   - Admin users see an "Admin" badge in the header
   - Admin users get access to the "⚙️ Settings" tab

### **🎯 Quick Test Scenarios**

#### **Scenario 1: Admin Login & Settings Access**
1. Click "🔽 Demo Accounts"
2. Click "Use Account" next to "admin"
3. Click "🚀 Sign In"
4. Notice the "Admin" badge in the header
5. See the "⚙️ Settings" tab in navigation
6. Click Settings to access admin panel

#### **Scenario 2: Regular User Experience**
1. Click "🔽 Demo Accounts"
2. Click "Use Account" next to "john.doe"
3. Click "🚀 Sign In"
4. Notice no "Admin" badge
5. Settings tab is not visible
6. Only Chat, Video, and Virtual World tabs available

## ⚙️ **Admin Settings Features**

### **How to Access Admin Settings**
1. Login with an admin account (see test accounts above)
2. Look for the "⚙️ Settings" tab in the navigation
3. Click the Settings tab to open the admin panel

### **Settings Features to Test**

#### **Video Service Selection:**
- **RingCentral Option:**
  - Professional video conferencing
  - Features: HD Video & Audio, Screen Sharing, Recording, Large Meetings, Enterprise Security

- **Jitsi Meet Option:**
  - Open-source video conferencing
  - Features: Free & Open Source, No Account Required, Browser-based, Basic Recording, Privacy Focused

#### **Settings Functionality:**
1. **Select a Video Service:**
   - Click on either RingCentral or Jitsi Meet option
   - Notice the visual feedback and selection state

2. **Apply Changes:**
   - Click "💾 Apply Changes" button
   - Confirm the change in the dialog that appears
   - Watch for success message

3. **Observe Navigation Changes:**
   - After changing the video service, notice that the "📹 Video" tab label updates
   - The tab will show either "📹 Jitsi Meet" or "📹 RingCentral" based on your selection

4. **Test Persistence:**
   - Refresh the browser page
   - Your video service preference should be remembered
   - The correct video module should be loaded

### 4. **Testing Video Service Switching**

#### **When RingCentral is Selected:**
- Navigation shows "📹 RingCentral"
- Clicking the video tab opens the RingCentral module
- You can test the mock RingCentral functionality

#### **When Jitsi Meet is Selected:**
- Navigation shows "📹 Jitsi Meet"
- Clicking the video tab opens the Jitsi Meet module
- You can test the Jitsi integration

### 5. **Non-Admin Users**

If you're logged in as a regular user (username doesn't contain "admin"):
- The Settings tab will NOT appear in the navigation
- Only Chat, Video (based on admin setting), and Virtual World tabs are visible
- The video service preference set by admin applies to all users

### 6. **Local Storage**

The settings are stored in browser localStorage with the key `stargetyOasisSettings`. You can:
- **View Settings:** Open browser DevTools → Application → Local Storage → `stargetyOasisSettings`
- **Clear Settings:** Delete the localStorage item to reset to defaults
- **Manual Testing:** Modify the JSON directly to test different states

### 7. **Demo Scenarios**

#### **Scenario 1: Admin Switching Services**
1. Login as admin user
2. Go to Settings
3. Switch from RingCentral to Jitsi Meet
4. Confirm the change
5. Notice navigation tab updates
6. Test the Jitsi video functionality

#### **Scenario 2: Settings Persistence**
1. Set video service to RingCentral
2. Refresh the page
3. Verify RingCentral is still selected
4. Check that the correct video module loads

#### **Scenario 3: Non-Admin Experience**
1. Change username to not include "admin"
2. Refresh the page
3. Verify Settings tab is hidden
4. Verify video service preference (set by admin) is still applied

### **🔄 Session Management**

#### **Logout Process**
- Click the "🚪 Logout" button in the header
- You'll be returned to the login screen
- Session data is cleared (stored in sessionStorage)
- Remembered username persists (stored in localStorage)

#### **Session Persistence**
- Login sessions persist until browser tab is closed
- Settings preferences persist across sessions
- Username can be remembered across sessions if checkbox is checked

### **🛠️ Technical Details**

#### **Authentication System**
- **Demo Mode:** Any username/password combination works
- **Test Accounts:** Predefined accounts with specific roles
- **Admin Detection:** Automatic based on username patterns
- **Session Storage:** Uses sessionStorage for login state
- **Username Memory:** Uses localStorage for remembered usernames

#### **Room System**
- **Default Room:** "general" (used if no room specified)
- **Custom Rooms:** Users can specify any room ID during login
- **Room Validation:** Only alphanumeric characters, dots, hyphens, underscores allowed
- **Room Persistence:** Room choice persists for the session

### **🎯 Complete Testing Workflow**

#### **Full Admin Test:**
1. Open `http://localhost:3000`
2. Click "🔽 Demo Accounts"
3. Use "admin" account
4. Verify admin badge appears
5. Access "⚙️ Settings" tab
6. Switch video service (RingCentral ↔ Jitsi)
7. Confirm changes in dialog
8. Verify video tab label updates
9. Test video functionality
10. Logout and login as regular user
11. Verify settings applied organization-wide

#### **User Experience Test:**
1. Login as "john.doe"
2. Verify no admin features visible
3. Test chat functionality
4. Test video calling (based on admin preference)
5. Test virtual world
6. Logout and try different room ID
7. Verify room-specific functionality

### **🔧 Troubleshooting**

- **Login issues:** Any username/password works in demo mode
- **Settings not showing:** Ensure username contains "admin", "administrator", or "root"
- **Changes not persisting:** Check browser localStorage/sessionStorage permissions
- **Video module not switching:** Verify settings were saved successfully
- **Session lost:** Sessions clear when browser tab closes (by design)

---

**🌟 This comprehensive login and admin system provides:**
- **Professional authentication experience**
- **Role-based access control**
- **Persistent user preferences**
- **Easy testing with predefined accounts**
- **Realistic session management**
- **Organization-wide settings control**

Perfect for demonstrating enterprise-level collaboration features! 🚀
