import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getAllStudents, upsertStudent, bulkUpsertStudents, deleteStudentById, bulkDeleteStudentsByIds, syncAllStudents } from './src/db/students.ts';
import { getAttendanceByDate, getAllAttendanceLogs, recordAttendanceLog, bulkUpdateAttendanceLogs, getAttendanceRecapStats } from './src/db/attendance.ts';
import { getDbSchoolConfig, saveDbSchoolConfig } from './src/db/config.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { Absensi } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // ================= API ROUTES (Cloud SQL / PostgreSQL) =================

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      database: 'Cloud SQL PostgreSQL',
      timestamp: new Date().toISOString(),
    });
  });

  // 1. School Configuration Routes
  app.get('/api/config', async (req, res) => {
    try {
      const config = await getDbSchoolConfig();
      res.json({ success: true, data: config });
    } catch (error: any) {
      console.error('Error fetching config from PostgreSQL:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/config', async (req, res) => {
    try {
      const saved = await saveDbSchoolConfig(req.body);
      res.json({ success: true, data: saved });
    } catch (error: any) {
      console.error('Error saving config to PostgreSQL:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2. Students Routes (Master Data Siswa)
  app.get('/api/students', async (req, res) => {
    try {
      const studentsList = await getAllStudents();
      res.json({ success: true, data: studentsList });
    } catch (error: any) {
      console.error('Error fetching students from PostgreSQL:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/students', async (req, res) => {
    try {
      const savedStudent = await upsertStudent(req.body);
      res.json({ success: true, data: savedStudent });
    } catch (error: any) {
      console.error('Error saving student to PostgreSQL:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/students/bulk', async (req, res) => {
    try {
      const studentsList = Array.isArray(req.body) ? req.body : req.body.students;
      const count = await bulkUpsertStudents(studentsList || []);
      res.json({ success: true, count });
    } catch (error: any) {
      console.error('Error bulk saving students to PostgreSQL:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/students/sync', async (req, res) => {
    try {
      const studentsList = Array.isArray(req.body) ? req.body : req.body.students;
      const result = await syncAllStudents(studentsList || []);
      res.json({ success: true, count: result.count, deleted: result.deleted });
    } catch (error: any) {
      console.error('Error syncing students to PostgreSQL:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/students/:id', async (req, res) => {
    try {
      const success = await deleteStudentById(req.params.id);
      res.json({ success });
    } catch (error: any) {
      console.error('Error deleting student from PostgreSQL:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/students/bulk-delete', async (req, res) => {
    try {
      const ids: string[] = Array.isArray(req.body) ? req.body : req.body.ids;
      const count = await bulkDeleteStudentsByIds(ids || []);
      res.json({ success: true, count });
    } catch (error: any) {
      console.error('Error bulk deleting students from PostgreSQL:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 3. Attendance Routes (Presensi & Rekapitulasi)
  app.get('/api/attendance', async (req, res) => {
    try {
      const tanggal = req.query.tanggal as string | undefined;
      let records: Absensi[];
      if (tanggal && tanggal !== 'all') {
        records = await getAttendanceByDate(tanggal);
      } else {
        records = await getAllAttendanceLogs(1000);
      }
      res.json({ success: true, data: records });
    } catch (error: any) {
      console.error('Error fetching attendance from PostgreSQL:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/attendance', async (req, res) => {
    try {
      const recorded = await recordAttendanceLog(req.body);
      res.json({ success: true, data: recorded });
    } catch (error: any) {
      console.error('Error recording attendance to PostgreSQL:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/attendance/bulk', async (req, res) => {
    try {
      const records = Array.isArray(req.body) ? req.body : req.body.records;
      const count = await bulkUpdateAttendanceLogs(records || []);
      res.json({ success: true, count });
    } catch (error: any) {
      console.error('Error bulk updating attendance in PostgreSQL:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/attendance/stats', async (req, res) => {
    try {
      const tanggal = (req.query.tanggal as string) || new Date().toISOString().split('T')[0];
      const stats = await getAttendanceRecapStats(tanggal);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('Error calculating attendance stats in PostgreSQL:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 4. User Sync Route
  app.post('/api/users/sync', async (req, res) => {
    try {
      const { uid, email, name } = req.body;
      if (!uid || !email) {
        return res.status(400).json({ error: 'UID and email are required' });
      }
      const user = await getOrCreateUser(uid, email, name);
      res.json({ success: true, data: user });
    } catch (error: any) {
      console.error('Error syncing user with PostgreSQL:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ================= VITE DEV OR STATIC PRODUCTION =================
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`> Full-stack server running on http://0.0.0.0:${PORT} [PostgreSQL connected]`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
