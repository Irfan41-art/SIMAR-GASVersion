import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize minimal Firebase for Google Auth popup Broker
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = { type: 'local_database' };

// ==========================================
// OFFLINE FIRESTORE EMULATOR Core (LocalStorage)
// ==========================================

// Global list of active snap listeners
interface Listener {
  type: 'doc' | 'query';
  ref: any;
  callback: (snapshot: any) => void;
}
const listeners: Listener[] = [];

const notifyListeners = (collectionName: string) => {
  listeners.forEach(l => {
    if (l.type === 'query' && l.ref.collectionName === collectionName) {
      l.callback(getQuerySnapshot(l.ref));
    } else if (l.type === 'doc' && l.ref.collectionName === collectionName) {
      l.callback(getDocSnapshot(l.ref));
    }
  });
};

function readCollection(collectionName: string): any[] {
  const raw = localStorage.getItem(`simar_db_${collectionName}`);
  if (!raw) {
    // Inject default initial admin if empty in "users" collection
    if (collectionName === 'users') {
      return [{
        uid: 'admin',
        name: 'Administrator',
        nip: '123456789',
        username: 'admin',
        password: 'admin',
        role: 'admin',
        photoURL: ''
      }];
    }
    // Inject initial settings if empty
    if (collectionName === 'settings') {
      return [{
        id: 'school',
        schoolName: 'SD Negeri 4 Pusungi',
        principalName: 'Kepala Sekolah',
        logoURL: ''
      }];
    }
    return [];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeCollection(collectionName: string, data: any[]) {
  localStorage.setItem(`simar_db_${collectionName}`, JSON.stringify(data));
  notifyListeners(collectionName);
}

// Emulated Functions matching firebase/firestore

export function collection(dbInstance: any, collectionName: string) {
  return {
    type: 'collection',
    collectionName
  };
}

export function doc(first: any, ...segments: string[]) {
  let collectionName = '';
  let id = '';
  if (segments.length === 2) {
    collectionName = segments[0];
    id = segments[1];
  } else if (segments.length === 1) {
    collectionName = first.collectionName || '';
    id = segments[0];
  } else {
    const path = typeof first === 'string' ? first : (segments[0] || '');
    const parts = path.split('/');
    collectionName = parts[0];
    id = parts[1] || '';
  }
  return {
    type: 'doc',
    collectionName,
    id
  };
}

export async function getDoc(docRef: any) {
  return getDocSnapshot(docRef);
}

function getDocSnapshot(docRef: any) {
  const records = readCollection(docRef.collectionName);
  const docId = docRef.id;
  const found = records.find(r => r.id === docId || r.uid === docId);
  return {
    exists: () => !!found,
    data: () => found ? JSON.parse(JSON.stringify(found)) : null,
    id: docId
  };
}

export async function setDoc(docRef: any, data: any, options?: any) {
  const records = readCollection(docRef.collectionName);
  const docId = docRef.id;
  const merge = options?.merge;

  const idx = records.findIndex(r => r.id === docId || r.uid === docId);
  const recordData = { ...(merge && idx >= 0 ? records[idx] : {}), ...data };
  
  if (!recordData.id) recordData.id = docId;
  if (!recordData.uid && docRef.collectionName === 'users') recordData.uid = docId;

  if (idx >= 0) {
    records[idx] = recordData;
  } else {
    records.push(recordData);
  }
  writeCollection(docRef.collectionName, records);
}

export async function addDoc(collectionRef: any, data: any) {
  const records = readCollection(collectionRef.collectionName);
  const newId = Math.random().toString(36).substring(2, 11).toUpperCase();
  const recordData = { id: newId, ...data };
  if (collectionRef.collectionName === 'users') {
    recordData.uid = newId;
  }
  records.push(recordData);
  writeCollection(collectionRef.collectionName, records);
  return {
    id: newId,
    getDoc: async () => ({
      exists: () => true,
      data: () => recordData,
      id: newId
    })
  };
}

export async function updateDoc(docRef: any, data: any) {
  const records = readCollection(docRef.collectionName);
  const docId = docRef.id;
  const idx = records.findIndex(r => r.id === docId || r.uid === docId);
  if (idx >= 0) {
    records[idx] = { ...records[idx], ...data };
    writeCollection(docRef.collectionName, records);
  } else {
    throw new Error(`Offline Firestore Document not found for update: ${docId}`);
  }
}

export async function deleteDoc(docRef: any) {
  const records = readCollection(docRef.collectionName);
  const docId = docRef.id;
  const filtered = records.filter(r => r.id !== docId && r.uid !== docId);
  writeCollection(docRef.collectionName, filtered);
}

export function where(field: string, operator: string, value: any) {
  return {
    type: 'where',
    field,
    operator,
    value
  };
}

export function query(collectionRef: any, ...constraints: any[]) {
  return {
    type: 'query',
    collectionName: collectionRef.collectionName,
    constraints
  };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
  return {
    type: 'orderBy',
    field,
    direction
  };
}

export function limit(count: number) {
  return { type: 'limit', count };
}

export function documentId() {
  return '__documentId__';
}

function getQuerySnapshot(queryRef: any) {
  const collectionName = queryRef.collectionName || queryRef;
  let records = readCollection(collectionName);

  if (queryRef.constraints) {
    queryRef.constraints.forEach((c: any) => {
      if (c.type === 'where') {
        const { field, operator, value } = c;
        records = records.filter(r => {
          const val = r[field];
          
          if (field === '__documentId__') {
            const docId = r.id || r.uid;
            if (operator === 'in') {
              return Array.isArray(value) && value.includes(docId);
            }
            if (operator === '==') {
              return docId === value;
            }
          }

          if (operator === '==' || operator === '===') {
            return val === value;
          }
          if (operator === '!=') {
            return val !== value;
          }
          if (operator === 'in') {
            return Array.isArray(value) && value.includes(val);
          }
          if (operator === 'array-contains') {
            return Array.isArray(val) && val.includes(value);
          }
          return true;
        });
      } else if (c.type === 'orderBy') {
        const { field, direction } = c;
        records = [...records].sort((a, b) => {
          const valA = a[field] ?? '';
          const valB = b[field] ?? '';
          if (valA < valB) return direction === 'asc' ? -1 : 1;
          if (valA > valB) return direction === 'asc' ? 1 : -1;
          return 0;
        });
      }
    });
  }

  const docs = records.map(r => ({
    id: r.id || r.uid,
    data: () => JSON.parse(JSON.stringify(r))
  }));

  return {
    docs,
    size: docs.length,
    forEach: (cb: (doc: any) => void) => docs.forEach(cb),
    empty: docs.length === 0,
    map: (cb: any) => docs.map(cb)
  };
}

export async function getDocs(queryRef: any) {
  return getQuerySnapshot(queryRef);
}

export function onSnapshot(
  ref: any, 
  callback: (snap: any) => void, 
  errorCallback?: (err: any) => void
) {
  // Fire current state immediately asynchronous to match Firebase
  setTimeout(() => {
    if (ref.type === 'doc') {
      callback(getDocSnapshot(ref));
    } else {
      callback(getQuerySnapshot(ref));
    }
  }, 0);

  const newListener: Listener = {
    type: ref.type === 'doc' ? 'doc' : 'query',
    ref,
    callback
  };

  listeners.push(newListener);

  // Return unsubscribe closure
  return () => {
    const idx = listeners.indexOf(newListener);
    if (idx >= 0) {
      listeners.splice(idx, 1);
    }
  };
}
