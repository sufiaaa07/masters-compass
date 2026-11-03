// Firebase: Google sign-in and per-user workspace sync to Firestore (users/{uid}).
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js";
import { getAnalytics, isSupported, logEvent, setUserId, setUserProperties } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyBSUevu8aqt7YzeHKTeKXuxjQIf7rOmttw",
  authDomain: "masters-compass.firebaseapp.com",
  projectId: "masters-compass",
  storageBucket: "masters-compass.firebasestorage.app",
  messagingSenderId: "645350599789",
  appId: "1:645350599789:web:9d0514c4866bbe92e8a364",
  measurementId: "G-W8J70N0MRY"
};

const firebaseApp = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);
// GA4 via Firebase Analytics (measurementId above). app.js calls track(),
// which queues events in window.mcTrackQ until this resolves.
isSupported().then(ok => {
  if (!ok) return;
  const analytics = getAnalytics(firebaseApp);
  window.mcTrack = (name, params) => logEvent(analytics, name, params || {});
  window.mcSetUser = (uid, props) => {
    setUserId(analytics, uid);
    if (props) setUserProperties(analytics, props);
  };
  if (window.mcUserProps) window.mcSetUser(window.mcUserProps.uid, window.mcUserProps.props);
  (window.mcTrackQ || []).splice(0).forEach(([name, params]) => window.mcTrack(name, params));
}).catch(() => {});

// AI page reading: a Cloud Function (functions/index.js) calls OpenAI with a
// key kept in Secret Manager. The browser only ever sees the extracted fields.
const extractProgramInfo = httpsCallable(getFunctions(firebaseApp, "us-central1"), "extractProgramInfo", { timeout: 70000 });
window.mcExtractProgram = async (text, url) => (await extractProgramInfo({ text, url })).data;

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const cleanWorkspace = workspace => {
  const copy = JSON.parse(JSON.stringify(workspace || {}));
  delete copy.user;
  return copy;
};

window.mcFirebaseSignIn = async () => {
  try {
    window.mcJustSignedIn = true;
    await signInWithPopup(firebaseAuth, googleProvider);
  } catch (error) {
    window.dispatchEvent(new CustomEvent("mc-auth-error", { detail: error?.message || "Google sign-in failed." }));
  }
};

window.mcFirebaseSignOut = async () => {
  try {
    await signOut(firebaseAuth);
  } catch (error) {
    window.dispatchEvent(new CustomEvent("mc-auth-error", { detail: error?.message || "Sign-out failed." }));
  }
};

window.mcCloudSaveNow = async workspace => {
  const user = firebaseAuth.currentUser;
  if (!user) return false;
  const ref = doc(firestore, "users", user.uid);
  await setDoc(ref, {
    schemaVersion: 1,
    email: user.email || "",
    displayName: user.displayName || "",
    workspace: cleanWorkspace(workspace),
    updatedAt: serverTimestamp()
  }, { merge: true });
  return true;
};

onAuthStateChanged(firebaseAuth, async user => {
  if (!user) {
    window.dispatchEvent(new CustomEvent("mc-auth-state", { detail: null }));
    return;
  }

  try {
    const ref = doc(firestore, "users", user.uid);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : null;

    window.dispatchEvent(new CustomEvent("mc-auth-state", {
      detail: {
        user: {
          uid: user.uid,
          name: user.displayName || (user.email ? user.email.split("@")[0] : "Applicant"),
          email: user.email || "",
          photoURL: user.photoURL || ""
        },
        cloudExists: !!(data && data.workspace),
        workspace: data && data.workspace ? data.workspace : null
      }
    }));
  } catch (error) {
    window.dispatchEvent(new CustomEvent("mc-auth-error", {
      detail: error?.message || "Could not load your Masters Compass workspace."
    }));
  }
});
