import React, { createContext, useContext, useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, linkWithPopup } from 'firebase/auth';
import { doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, SchoolSettings } from '../types';

interface SheetsConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  lastSynced: string;
  connectedEmail: string;
}

interface AppContextType {
  user: any | null;
  profile: UserProfile | null;
  settings: SchoolSettings | null;
  loading: boolean;
  sheetsConfig: SheetsConfig | null;
  sheetsAccessToken: string | null;
  setSheetsAccessToken: (token: string | null) => void;
  linkGoogleAccount: () => Promise<{ user: any; accessToken: string; email: string } | null>;
  saveSheetsConfig: (config: SheetsConfig) => Promise<void>;
  disconnectSheets: () => Promise<void>;
  loginWithCredentials: (username: string, psw: string, role: 'admin' | 'guru') => Promise<UserProfile>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({
  user: null,
  profile: null,
  settings: null,
  loading: true,
  sheetsConfig: null,
  sheetsAccessToken: null,
  setSheetsAccessToken: () => {},
  linkGoogleAccount: async () => null,
  saveSheetsConfig: async () => {},
  disconnectSheets: async () => {},
  loginWithCredentials: async () => { throw new Error('Not implemented'); },
  logout: async () => {},
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(() => {
    try {
      const u = localStorage.getItem('simar_current_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const p = localStorage.getItem('simar_current_profile');
      return p ? JSON.parse(p) : null;
    } catch {
      return null;
    }
  });

  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [sheetsConfig, setSheetsConfig] = useState<SheetsConfig | null>(null);
  
  const [sheetsAccessToken, setSheetsAccessTokenState] = useState<string | null>(() => {
    return sessionStorage.getItem('simar_sheets_token') || null;
  });
  
  const [loading, setLoading] = useState(true);

  const setSheetsAccessToken = (token: string | null) => {
    setSheetsAccessTokenState(token);
    if (token) {
      sessionStorage.setItem('simar_sheets_token', token);
    } else {
      sessionStorage.removeItem('simar_sheets_token');
    }
  };

  const linkGoogleAccount = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    
    try {
      let result;
      if (auth.currentUser) {
        try {
          result = await linkWithPopup(auth.currentUser, provider);
        } catch {
          result = await signInWithPopup(auth, provider);
        }
      } else {
        result = await signInWithPopup(auth, provider);
      }

      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken || null;
      
      if (accessToken) {
        setSheetsAccessToken(accessToken);
        return {
          user: result.user,
          accessToken,
          email: result.user.email || ''
        };
      }
      return null;
    } catch (error) {
      console.error('Google Account authorization error:', error);
      throw error;
    }
  };

  const saveSheetsConfig = async (config: SheetsConfig) => {
    await setDoc(doc(db, 'settings', 'sheets'), config);
    setSheetsConfig(config);
  };

  const disconnectSheets = async () => {
    await deleteDoc(doc(db, 'settings', 'sheets'));
    setSheetsConfig(null);
    setSheetsAccessToken(null);
  };

  const loginWithCredentials = async (username: string, psw: string, role: 'admin' | 'guru'): Promise<UserProfile> => {
    const cleanUsername = username.trim();
    const cleanPsw = psw.trim();

    // Special Condition: Default admin login credentials (admin/admin)
    if (role === 'admin' && cleanUsername === 'admin' && cleanPsw === 'admin') {
      const adminProfile: UserProfile = {
        uid: 'admin',
        username: 'admin',
        role: 'admin',
        name: 'Administrator Kepala',
        nip: '123456789',
        photoURL: '',
        subject: 'All Subjects',
        classAssigned: 'All Classes'
      };

      setUser({ uid: 'admin', role: 'admin' });
      setProfile(adminProfile);

      localStorage.setItem('simar_current_user', JSON.stringify({ uid: 'admin', role: 'admin' }));
      localStorage.setItem('simar_current_profile', JSON.stringify(adminProfile));

      // Persist in mock db registry so reports/lookups match it
      const usersRegistry = localStorage.getItem('simar_db_users') ? JSON.parse(localStorage.getItem('simar_db_users')!) : [];
      if (!usersRegistry.find((r: any) => r.uid === 'admin')) {
        usersRegistry.push(adminProfile);
        localStorage.setItem('simar_db_users', JSON.stringify(usersRegistry));
      }

      return adminProfile;
    }

    // Otherwise lookup custom GURUs in our local state lists
    const rawUsers = localStorage.getItem('simar_db_users');
    const users: any[] = rawUsers ? JSON.parse(rawUsers) : [];

    const found = users.find(u => 
      (u.username?.toLowerCase() === cleanUsername.toLowerCase() || u.nip === cleanUsername) && 
      u.password === cleanPsw && 
      u.role === role
    );

    if (!found) {
      throw new Error('Kredensial tidak valid. Periksa kembali Username/NIP dan Password.');
    }

    const matchedProfile: UserProfile = {
      uid: found.uid || found.id,
      name: found.name,
      nip: found.nip,
      subject: found.subject || '',
      classAssigned: found.classAssigned || '',
      username: found.username,
      password: found.password,
      role: found.role,
      photoURL: found.photoURL || ''
    };

    setUser({ uid: matchedProfile.uid, role: matchedProfile.role });
    setProfile(matchedProfile);

    localStorage.setItem('simar_current_user', JSON.stringify({ uid: matchedProfile.uid, role: matchedProfile.role }));
    localStorage.setItem('simar_current_profile', JSON.stringify(matchedProfile));

    return matchedProfile;
  };

  const logout = async () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem('simar_current_user');
    localStorage.removeItem('simar_current_profile');
  };

  useEffect(() => {
    // Listen for school settings on mock DB
    const unsubSettings = onSnapshot(doc(db, 'settings', 'school'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as SchoolSettings);
      } else {
        const defaultSettings = { schoolName: 'SD Negeri 4 Pusungi', principalName: 'Kepala Sekolah', logoURL: '' };
        setSettings(defaultSettings);
        localStorage.setItem('simar_db_settings', JSON.stringify([ { id: 'school', ...defaultSettings } ]));
      }
    });

    // Listen for Google Sheets connection configuration on mock DB
    const unsubSheets = onSnapshot(doc(db, 'settings', 'sheets'), (snapshot) => {
      if (snapshot.exists()) {
        setSheetsConfig(snapshot.data() as SheetsConfig);
      } else {
        setSheetsConfig(null);
      }
    });

    let unsubProfile: (() => void) | null = null;

    if (user?.uid) {
      unsubProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const prof = docSnap.data() as UserProfile;
          setProfile(prof);
          localStorage.setItem('simar_current_profile', JSON.stringify(prof));
        }
      });
    } else {
      setProfile(null);
    }

    setLoading(false);

    return () => {
      unsubSettings();
      unsubSheets();
      if (unsubProfile) unsubProfile();
    };
  }, [user]);

  return (
    <AppContext.Provider value={{
      user,
      profile,
      settings,
      loading,
      sheetsConfig,
      sheetsAccessToken,
      setSheetsAccessToken,
      linkGoogleAccount,
      saveSheetsConfig,
      disconnectSheets,
      loginWithCredentials,
      logout
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
