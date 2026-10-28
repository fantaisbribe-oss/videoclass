# CipherClass — Secure End-to-End Encrypted Virtual Classroom

CipherClass is a production-grade virtual classroom web application engineered with client-side Zero-Knowledge End-to-End Encryption (AES-256-GCM), real-time WebRTC multi-peer video conferencing, collaborative interactive whiteboard, live lesson documents, and classroom management controls.

---

## 🔒 Security & Cryptographic Architecture

### 1. Zero-Knowledge Key Derivation
- **Room Key Derivation**: AES-256-GCM symmetric keys are derived in the user's browser using PBKDF2 with 100,000 SHA-256 iterations and classroom-specific salt.
- **Client-Side Only**: Encryption keys NEVER leave the local browser environment.
- **Zero-Knowledge URL Hash**: The room secret is appended as an anchor hash (`#key=...`). Browsers never transmit URL fragment identifiers across HTTP requests, guaranteeing that neither proxies, firewalls, Cloud Run, nor hosting providers ever see the room key.
- **Safety Number / Fingerprint**: Every participant receives a 60-digit hexadecimal cryptographic fingerprint formatted into twelve 5-digit security blocks for out-of-band verification.

### 2. Double-Layer Communication Bridge
- **Firestore Real-Time Sync**: Synchronizes persistent room presence, attendance records, encrypted chat messages, whiteboard canvas elements, and shared lesson documents.
- **WebRTC Peer-to-Peer Signaling**: Establishes direct P2P mesh audio/video streams across remote devices using Google STUN relays (`stun.l.google.com:19302`).
- **WebSocket Fallback Bridge**: An Express + ws coordination server providing instant fallback connectivity in dev and containerized hosting.

---

## 🌐 Public Testing & Multi-Device Access

### Public HTTPS URL (Active AI Studio Container)
- **App Home / Lobby**: `https://ais-pre-pjt3i2ehwk6vpxnoxzbbnc-127082696976.europe-west1.run.app`
- **Pre-keyed Optics Room**: `https://ais-pre-pjt3i2ehwk6vpxnoxzbbnc-127082696976.europe-west1.run.app/?room=optics-301#key=q8Z3fR...`

### Multi-Device Testing Steps:
1. **Device 1 (Teacher - Laptop/Desktop)**:
   - Open the URL in Chrome, Firefox, or Safari.
   - Click the **"Dr. Vance (Teacher)"** quick-preset button.
   - Click **"Enter Classroom"**. Grant camera/microphone permissions.
2. **Device 2 (Student - Mobile Phone or Second Laptop)**:
   - Open the same URL or click **"Copy Invite Link"** from the Top Bar.
   - On the mobile phone / second browser window, select **"Alex Rivera (Student)"** or **"Sarah Chen (Student)"**.
   - Click **"Enter Classroom"**.
3. **Verify Synchronized Features**:
   - Both devices see each other in the participant roster.
   - Chat messages sent from Device 1 display encrypted wire ciphertext and instantly decrypt on Device 2.
   - Drawing on the Whiteboard on Device 1 syncs immediately to Device 2.
   - Editing lesson notes in the Document view updates seamlessly across both devices.
   - Teacher "Mute All", "Lock Room", or "Create Poll" actions take immediate effect on student devices.

---

## 🚀 Firebase Backend Configuration

- **Firebase Project ID**: `trusty-gearbox-h8f9p`
- **Firestore Database ID**: `ai-studio-cipherclasssecur-c3f13504-1d04-4df5-8e4c-749768f6dd9f`
- **Storage Bucket**: `trusty-gearbox-h8f9p.firebasestorage.app`
- **Security Rules**: Deployed in `firestore.rules` with default-deny, role immutability checks, and sender UID validation.

---

## 📦 Automated GitHub Deployment (CI/CD)

The project includes `.github/workflows/firebase-deploy.yml` for automated deployment to Firebase Hosting on every commit to `main`.

### To connect to your GitHub repository:
1. Initialize git and commit:
   ```bash
   git init
   git add .
   git commit -m "feat: complete CipherClass E2EE virtual classroom with Firebase backend"
   ```
2. Add your GitHub remote:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-username>/cipherclass.git
   git push -u origin main
   ```
3. Add the GitHub Action secret:
   - In GitHub repository settings -> **Secrets and variables** -> **Actions**.
   - Add `FIREBASE_SERVICE_ACCOUNT_TRUSTY_GEARBOX_H8F9P` (generated from Firebase Console -> Project Settings -> Service Accounts -> Generate new private key).
