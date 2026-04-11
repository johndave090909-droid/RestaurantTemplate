import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export type Role = 'superAdmin' | 'admin' | 'manager' | 'staff';

const SUPER_ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

interface AuthContextType {
  user: User | null;
  role: Role | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const provider = new GoogleAuthProvider();

async function findUserByEmail(email: string) {
  if (!email) return null;
  const snap = await getDoc(doc(db, 'userEmails', email));
  if (!snap.exists()) return null;
  return snap;
}

async function resolveRole(user: User): Promise<Role> {
  const email = user.email?.toLowerCase() ?? '';
  if (SUPER_ADMIN_EMAILS.includes(email)) return 'superAdmin';

  const snap = await getDoc(doc(db, 'users', user.uid));
  if (snap.exists()) return (snap.data().role as Role) ?? 'staff';

  // Fallback: allow matching by email for pre-created/invited users
  const byEmail = await findUserByEmail(email);
  if (byEmail) return (byEmail.data().role as Role) ?? 'staff';

  return 'staff'; // unknown user - no access granted
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const r = await resolveRole(u);
        setRole(r);
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, provider);
    const u = result.user;
    const email = u.email?.toLowerCase() ?? '';

    if (SUPER_ADMIN_EMAILS.includes(email)) {
      // Ensure superAdmin record exists in Firestore
      await setDoc(doc(db, 'users', u.uid), {
        email: u.email,
        displayName: u.displayName,
        role: 'superAdmin',
        photoURL: u.photoURL,
      }, { merge: true });
      setRole('superAdmin');
      return;
    }

    let snap = await getDoc(doc(db, 'users', u.uid));
    if (!snap.exists()) {
      const byEmail = await findUserByEmail(email);
      if (!byEmail) {
        await signOut(auth);
        throw new Error('Access denied. Your account has not been granted access.');
      }
      // Link the invite record to the real UID for future fast lookups
      await setDoc(doc(db, 'users', u.uid), {
        email: u.email,
        displayName: u.displayName,
        role: (byEmail.data().role as Role) ?? 'staff',
        photoURL: u.photoURL,
      }, { merge: true });
      snap = await getDoc(doc(db, 'users', u.uid));
    }
    const r = snap.data().role as Role;
    setRole(r);
  };

  const logout = async () => {
    await signOut(auth);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export const can = {
  viewOrders: (r: Role | null) => !!r,
  manageOrders: (r: Role | null) => r === 'superAdmin' || r === 'admin' || r === 'manager',
  viewReservations: (r: Role | null) => !!r,
  manageReservations: (r: Role | null) => r === 'superAdmin' || r === 'admin' || r === 'manager',
  manageMenu: (r: Role | null) => r === 'superAdmin' || r === 'admin' || r === 'manager',
  manageStaff: (r: Role | null) => r === 'superAdmin' || r === 'admin',
  manageSite: (r: Role | null) => r === 'superAdmin',
};
