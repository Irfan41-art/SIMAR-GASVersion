import { UserProfile, Student, Attendance, Grade, Journal, SchoolSettings } from '../types';

export interface SheetsSyncState {
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  lastSynced: string | null;
  connectedEmail: string | null;
}

// Check if spreadsheet contains required sheets
export async function checkSpreadsheetStructure(accessToken: string, spreadsheetId: string): Promise<boolean> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    const sheetTitles = data.sheets?.map((s: any) => s.properties?.title) || [];
    const required = ['Settings', 'Users', 'Students', 'Attendance', 'Grades', 'Journals'];
    return required.every(t => sheetTitles.includes(t));
  } catch (error) {
    console.error('Error checking spreadsheet structure:', error);
    return false;
  }
}

// Create a new master spreadsheet with correct tables/sheets
export async function createDatabaseSpreadsheet(accessToken: string, schoolName: string): Promise<{ spreadsheetId: string; spreadsheetUrl: string } | null> {
  try {
    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: `SIMAR DB - ${schoolName || 'SD Negeri 4 Pusungi'}`
        },
        sheets: [
          { properties: { title: 'Settings', gridProperties: { rowCount: 10, columnCount: 5 } } },
          { properties: { title: 'Users', gridProperties: { rowCount: 50, columnCount: 10 } } },
          { properties: { title: 'Students', gridProperties: { rowCount: 100, columnCount: 10 } } },
          { properties: { title: 'Attendance', gridProperties: { rowCount: 200, columnCount: 15 } } },
          { properties: { title: 'Grades', gridProperties: { rowCount: 200, columnCount: 15 } } },
          { properties: { title: 'Journals', gridProperties: { rowCount: 200, columnCount: 15 } } },
        ]
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Create spreadsheet failed:', errText);
      throw new Error(`Failed to create spreadsheet: ${errText}`);
    }

    const data = await response.json();
    const spreadsheetId = data.spreadsheetId;
    const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // Initialize headers for each sheet
    await initializeSheetHeaders(accessToken, spreadsheetId);

    return { spreadsheetId, spreadsheetUrl };
  } catch (err) {
    console.error('Failed to create database spreadsheet:', err);
    return null;
  }
}

// Fill spreadsheet with table headers
async function initializeSheetHeaders(accessToken: string, spreadsheetId: string) {
  const batchData = [
    {
      range: 'Settings!A1:C1',
      values: [['School Name', 'Principal Name', 'Logo URL']]
    },
    {
      range: 'Users!A1:H1',
      values: [['ID', 'Name', 'NIP', 'Subject', 'Class Assigned', 'Username', 'Password', 'Role']]
    },
    {
      range: 'Students!A1:F1',
      values: [['ID', 'Name', 'NISN', 'NIS', 'Class', 'Teacher ID']]
    },
    {
      range: 'Attendance!A1:I1',
      values: [['ID', 'Date', 'Month', 'Year', 'Subject', 'Class', 'Session', 'Records (JSON)', 'Teacher ID']]
    },
    {
      range: 'Grades!A1:G1',
      values: [['ID', 'Subject', 'Class', 'Title', 'Records (JSON)', 'Teacher ID', 'Created At']]
    },
    {
      range: 'Journals!A1:K1',
      values: [['ID', 'Date', 'Class', 'Subject', 'Session', 'Present Count', 'Absent Count', 'Status', 'Material', 'Reflection', 'Teacher ID']]
    }
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: batchData
    })
  });
}

// Convert Firestore arrays to row values and overwrite ranges in Sheets
export async function syncDataToSheets(
  accessToken: string,
  spreadsheetId: string,
  data: {
    settings?: SchoolSettings;
    users?: UserProfile[];
    students?: Student[];
    attendance?: Attendance[];
    grades?: Grade[];
    journals?: Journal[];
  }
): Promise<boolean> {
  try {
    const batchData: any[] = [];

    if (data.settings) {
      batchData.push({
        range: 'Settings!A2:C2',
        values: [[data.settings.schoolName, data.settings.principalName, data.settings.logoURL || '']]
      });
    }

    if (data.users) {
      const userRows = data.users.map(u => [
        u.uid, u.name, u.nip, u.subject || '', u.classAssigned || '', u.username, u.password || '', u.role
      ]);
      // Clear old values down to 100 rows, then update
      await clearSheetRange(accessToken, spreadsheetId, 'Users!A2:H100');
      if (userRows.length > 0) {
        batchData.push({
          range: `Users!A2:H${userRows.length + 1}`,
          values: userRows
        });
      }
    }

    if (data.students) {
      const studentRows = data.students.map(s => [
        s.id, s.name, s.nisn, s.nis, s.class, s.teacherId
      ]);
      await clearSheetRange(accessToken, spreadsheetId, 'Students!A2:F200');
      if (studentRows.length > 0) {
        batchData.push({
          range: `Students!A2:F${studentRows.length + 1}`,
          values: studentRows
        });
      }
    }

    if (data.attendance) {
      const attendanceRows = data.attendance.map(a => [
        a.id, a.date, a.month, a.year, a.subject, a.class, a.session, JSON.stringify(a.records), a.teacherId
      ]);
      await clearSheetRange(accessToken, spreadsheetId, 'Attendance!A2:I500');
      if (attendanceRows.length > 0) {
        batchData.push({
          range: `Attendance!A2:I${attendanceRows.length + 1}`,
          values: attendanceRows
        });
      }
    }

    if (data.grades) {
      const gradeRows = data.grades.map(g => [
        g.id, g.subject, g.class, g.title, JSON.stringify(g.records), g.teacherId, g.createdAt || ''
      ]);
      await clearSheetRange(accessToken, spreadsheetId, 'Grades!A2:G500');
      if (gradeRows.length > 0) {
        batchData.push({
          range: `Grades!A2:G${gradeRows.length + 1}`,
          values: gradeRows
        });
      }
    }

    if (data.journals) {
      const journalRows = data.journals.map(j => [
        j.id, j.date, j.class, j.subject, j.session, j.presentCount, j.absentCount, j.status, j.material, j.reflection, j.teacherId
      ]);
      await clearSheetRange(accessToken, spreadsheetId, 'Journals!A2:K500');
      if (journalRows.length > 0) {
        batchData.push({
          range: `Journals!A2:K${journalRows.length + 1}`,
          values: journalRows
        });
      }
    }

    if (batchData.length === 0) return true;

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: batchData
      })
    });

    return res.ok;
  } catch (error) {
    console.error('Error syncing data to Google Sheets:', error);
    return false;
  }
}

// Clear a specific sheet range prior to rewrite
async function clearSheetRange(accessToken: string, spreadsheetId: string, range: string) {
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  } catch (error) {
    console.error(`Error clearing range ${range}:`, error);
  }
}

// Import data from Google Sheets values, converting rows back to typed objects
export async function importDataFromSheets(
  accessToken: string,
  spreadsheetId: string
): Promise<{
  settings?: SchoolSettings;
  users?: UserProfile[];
  students?: Student[];
  attendance?: Attendance[];
  grades?: Grade[];
  journals?: Journal[];
} | null> {
  try {
    const ranges = [
      'Settings!A2:C2',
      'Users!A2:H200',
      'Students!A2:F1000',
      'Attendance!A2:I2000',
      'Grades!A2:G2000',
      'Journals!A2:K2000'
    ];

    const rangeParams = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangeParams}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      console.error('Batch get values from Sheets failed:', await res.text());
      return null;
    }

    const data = await res.json();
    const valueRanges = data.valueRanges || [];

    const settingsValues = valueRanges[0]?.values || [];
    const usersValues = valueRanges[1]?.values || [];
    const studentsValues = valueRanges[2]?.values || [];
    const attendanceValues = valueRanges[3]?.values || [];
    const gradesValues = valueRanges[4]?.values || [];
    const journalsValues = valueRanges[5]?.values || [];

    const result: any = {};

    if (settingsValues.length > 0) {
      const row = settingsValues[0];
      result.settings = {
        schoolName: row[0] || '',
        principalName: row[1] || '',
        logoURL: row[2] || ''
      };
    }

    if (usersValues.length > 0) {
      result.users = usersValues.map((row: any) => ({
        uid: row[0],
        name: row[1] || '',
        nip: row[2] || '',
        subject: row[3] || '',
        classAssigned: row[4] || '',
        username: row[5] || '',
        password: row[6] || '',
        role: (row[7] || 'guru') as 'admin' | 'guru'
      })).filter((u: any) => u.uid && u.username);
    }

    if (studentsValues.length > 0) {
      result.students = studentsValues.map((row: any) => ({
        id: row[0],
        name: row[1] || '',
        nisn: row[2] || '',
        nis: row[3] || '',
        class: row[4] || '',
        teacherId: row[5] || ''
      })).filter((s: any) => s.id && s.name);
    }

    if (attendanceValues.length > 0) {
      result.attendance = attendanceValues.map((row: any) => {
        let records = {};
        try {
          records = row[7] ? JSON.parse(row[7]) : {};
        } catch {
          records = {};
        }
        return {
          id: row[0],
          date: row[1] || '',
          month: row[2] || '',
          year: row[3] || '',
          subject: row[4] || '',
          class: row[5] || '',
          session: row[6] || '',
          records,
          teacherId: row[8] || '',
          createdAt: new Date().toISOString()
        };
      }).filter((a: any) => a.id);
    }

    if (gradesValues.length > 0) {
      result.grades = gradesValues.map((row: any) => {
        let records = {};
        try {
          records = row[4] ? JSON.parse(row[4]) : {};
        } catch {
          records = {};
        }
        return {
          id: row[0],
          subject: row[1] || '',
          class: row[2] || '',
          title: row[3] || '',
          records,
          teacherId: row[5] || '',
          createdAt: row[6] || new Date().toISOString()
        };
      }).filter((g: any) => g.id);
    }

    if (journalsValues.length > 0) {
      result.journals = journalsValues.map((row: any) => ({
        id: row[0],
        date: row[1] || '',
        class: row[2] || '',
        subject: row[3] || '',
        session: row[4] || '',
        presentCount: Number(row[5] || 0),
        absentCount: Number(row[6] || 0),
        status: (row[7] || 'terlaksana') as 'terlaksana' | 'tertunda',
        material: row[8] || '',
        reflection: row[9] || '',
        teacherId: row[10] || '',
        createdAt: new Date().toISOString()
      })).filter((j: any) => j.id);
    }

    return result;
  } catch (error) {
    console.error('Error importing data from Google Sheets:', error);
    return null;
  }
}
