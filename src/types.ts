export type Role = 'admin' | 'guru';

export interface UserProfile {
  uid: string;
  name: string;
  nip: string;
  subject?: string;
  classAssigned?: string;
  username: string;
  role: Role;
  photoURL?: string;
  password?: string; // Stored for custom login simulation if needed, though Auth is preferred
}

export interface SchoolSettings {
  schoolName: string;
  principalName: string;
  logoURL?: string;
}

export interface Student {
  id: string;
  name: string;
  nisn: string;
  nis: string;
  class: string;
  teacherId: string;
}

export interface Attendance {
  id: string;
  date: string;
  month: string;
  year: string;
  subject: string;
  class: string;
  session: string;
  records: Record<string, string>; // studentId: status (Hadir, Izin, Sakit, Alpa)
  teacherId: string;
  createdAt: any;
}

export interface Grade {
  id: string;
  subject: string;
  class: string;
  title: string;
  records: Record<string, number>; // studentId: score
  teacherId: string;
  createdAt: any;
}

export interface Journal {
  id: string;
  date: string;
  class: string;
  subject: string;
  session: string;
  presentCount: number;
  absentCount: number;
  status: 'terlaksana' | 'tertunda';
  material: string;
  reflection: string;
  teacherId: string;
  createdAt: any;
}
