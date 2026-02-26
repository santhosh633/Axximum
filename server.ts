import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { google } from "googleapis";
import cron from "node-cron";

const db = new Database("tracker.db");

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT,
    department TEXT
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'Active',
    priority TEXT DEFAULT 'Medium',
    deadline DATE,
    description TEXT,
    daily_target INTEGER DEFAULT 100
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    project_id INTEGER,
    hours_per_week INTEGER DEFAULT 40,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT,
    project_name TEXT,
    task TEXT,
    manhours REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sync_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    spreadsheet_id TEXT,
    access_token TEXT,
    refresh_token TEXT,
    last_sync DATETIME
  );

  CREATE TABLE IF NOT EXISTS task_status_cache (
    id TEXT PRIMARY KEY,
    last_status TEXT
  );
`);

// Seed initial data if empty
try {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (userCount.count === 0) {
    console.log("Seeding database...");
    const insertUser = db.prepare("INSERT INTO users (name, email, role, department) VALUES (?, ?, ?, ?)");
    const insertProject = db.prepare("INSERT INTO projects (name, status, priority, deadline, description, daily_target) VALUES (?, ?, ?, ?, ?, ?)");
    const insertAssignment = db.prepare("INSERT INTO assignments (user_id, project_id) VALUES (?, ?)");

    // Add some sample users (up to 90+ as requested)
    for (let i = 1; i <= 95; i++) {
      insertUser.run([`User ${i}`, `user${i}@example.com`, i % 5 === 0 ? 'Lead' : 'Developer', i % 3 === 0 ? 'Engineering' : 'Product']);
    }

    // Add some sample projects (30+ as requested)
    for (let i = 1; i <= 32; i++) {
      const statuses = ['Active', 'On Hold', 'Completed', 'Planning'];
      const priorities = ['High', 'Medium', 'Low'];
      const targets = [100, 200, 400, 800, 1000];
      insertProject.run([
        `Project ${String.fromCharCode(65 + (i % 26))}${i}`,
        statuses[i % 4],
        priorities[i % 3],
        '2026-12-31',
        `Description for Project ${i}`,
        targets[i % 5]
      ]);
    }

    // Random assignments
    for (let i = 1; i <= 95; i++) {
      insertAssignment.run([i, (i % 32) + 1]);
    }

    // Add some sample activity logs for the current month
    const insertLog = db.prepare("INSERT INTO activity_logs (user_name, project_name, task, manhours, timestamp) VALUES (?, ?, ?, ?, ?)");
    const now = new Date();
    for (let i = 0; i < 10; i++) { // Last 10 days
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      for (let j = 1; j <= 32; j++) { // For each project
        const project_name = `Project ${String.fromCharCode(65 + (j % 26))}${j}`;
        insertLog.run([
          `User ${(j % 95) + 1}`,
          project_name,
          "Daily sync and task execution",
          Math.floor(Math.random() * 500) + 100, // Random manhours
          `${dateStr} 10:00:00`
        ]);
      }
    }
    console.log("Seeding complete.");
  }
} catch (error) {
  console.error("Error during seeding:", error);
}

async function startServer() {
  console.log("Starting server...");
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Google OAuth Setup
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL}/auth/google/callback`
  );

  app.get("/api/auth/google/url", (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      prompt: "consent"
    });
    res.json({ url });
  });

  app.get("/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      db.prepare(`
        INSERT INTO sync_settings (id, access_token, refresh_token) 
        VALUES (1, ?, ?) 
        ON CONFLICT(id) DO UPDATE SET access_token=excluded.access_token, refresh_token=excluded.refresh_token
      `).run(tokens.access_token, tokens.refresh_token);
      
      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
              window.close();
            </script>
            <p>Authentication successful! You can close this window.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Google Auth Error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.post("/api/sync/settings", (req, res) => {
    const { spreadsheetId } = req.body;
    db.prepare(`
      INSERT INTO sync_settings (id, spreadsheet_id) 
      VALUES (1, ?) 
      ON CONFLICT(id) DO UPDATE SET spreadsheet_id=excluded.spreadsheet_id
    `).run(spreadsheetId);
    res.json({ success: true });
  });

  app.get("/api/sync/status", (req, res) => {
    const settings = db.prepare("SELECT spreadsheet_id, last_sync FROM sync_settings WHERE id = 1").get();
    res.json(settings || {});
  });

  app.get("/api/activity", (req, res) => {
    const logs = db.prepare("SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 100").all();
    res.json(logs);
  });

  app.get("/api/reports/user-performance", (req, res) => {
    try {
      const users = db.prepare("SELECT id, name FROM users").all() as any[];
      const logs = db.prepare(`
        SELECT user_name, manhours, strftime('%Y-%m-%d', timestamp) as day 
        FROM activity_logs 
        WHERE timestamp >= date('now', 'start of month')
      `).all() as any[];

      const report = users.map(u => {
        const userLogs = logs.filter(l => l.user_name === u.name);
        const total = userLogs.reduce((sum, l) => sum + l.manhours, 0);
        
        // Group by day
        const daily = userLogs.reduce((acc: any, l) => {
          acc[l.day] = (acc[l.day] || 0) + l.manhours;
          return acc;
        }, {});

        return {
          name: u.name,
          total,
          daily
        };
      });

      res.json({
        data: report
      });
    } catch (error) {
      console.error("Error in /api/reports/user-performance:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/reports/utilization", (req, res) => {
    try {
      const projects = db.prepare("SELECT id, name, daily_target FROM projects").all() as any[];
      const logs = db.prepare(`
        SELECT project_name, manhours, strftime('%Y-%m-%d', timestamp) as day 
        FROM activity_logs 
        WHERE timestamp >= date('now', 'start of month')
      `).all() as any[];

      const workingDays = 25; // As per screenshot example
      
      const report = projects.map(p => {
        const projectLogs = logs.filter(l => l.project_name === p.name);
        const total = projectLogs.reduce((sum, l) => sum + l.manhours, 0);
        const utilization = p.daily_target > 0 ? (total / (p.daily_target * workingDays)) * 100 : 0;
        
        // Group by day
        const daily = projectLogs.reduce((acc: any, l) => {
          acc[l.day] = (acc[l.day] || 0) + l.manhours;
          return acc;
        }, {});

        return {
          name: p.name,
          daily_target: p.daily_target,
          total,
          utilization: utilization.toFixed(2),
          daily
        };
      });

      res.json({
        workingDays,
        overallUtilization: (report.reduce((sum, r) => sum + parseFloat(r.utilization), 0) / report.length).toFixed(2),
        data: report
      });
    } catch (error) {
      console.error("Error in /api/reports/utilization:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // API Routes
  app.get("/api/stats", (req, res) => {
    try {
      const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
      const totalProjects = db.prepare("SELECT COUNT(*) as count FROM projects").get() as { count: number };
      const projectStatuses = db.prepare("SELECT status, COUNT(*) as count FROM projects GROUP BY status").all();
      const activeAssignments = db.prepare("SELECT COUNT(*) as count FROM assignments").get() as { count: number };
      
      res.json({
        totalUsers: totalUsers.count,
        totalProjects: totalProjects.count,
        projectStatuses,
        activeAssignments: activeAssignments.count
      });
    } catch (error) {
      console.error("Error in /api/stats:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/projects", (req, res) => {
    try {
      const projects = db.prepare(`
        SELECT p.*, COUNT(a.user_id) as team_size 
        FROM projects p 
        LEFT JOIN assignments a ON p.id = a.project_id 
        GROUP BY p.id
      `).all();
      res.json(projects);
    } catch (error) {
      console.error("Error in /api/projects:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/users", (req, res) => {
    try {
      const users = db.prepare(`
        SELECT u.*, p.name as project_name 
        FROM users u 
        LEFT JOIN assignments a ON u.id = a.user_id 
        LEFT JOIN projects p ON a.project_id = p.id
      `).all();
      res.json(users);
    } catch (error) {
      console.error("Error in /api/users:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Background Sync Task (Every 1 second)
  cron.schedule("* * * * * *", async () => {
    try {
      const settings = db.prepare("SELECT * FROM sync_settings WHERE id = 1").get() as any;
      if (!settings || !settings.spreadsheet_id || !settings.refresh_token) {
        return;
      }

      oauth2Client.setCredentials({
        refresh_token: settings.refresh_token,
        access_token: settings.access_token
      });

      const sheets = google.sheets({ version: "v4", auth: oauth2Client });
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: settings.spreadsheet_id,
        range: "Sheet1!A2:F", // User, Project, Task, Manhours, Status, UniqueID
      });

      const rows = response.data.values;
      if (rows && rows.length) {
        const insertLog = db.prepare("INSERT INTO activity_logs (user_name, project_name, task, manhours) VALUES (?, ?, ?, ?)");
        const getCache = db.prepare("SELECT last_status FROM task_status_cache WHERE id = ?");
        const setCache = db.prepare("INSERT INTO task_status_cache (id, last_status) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET last_status=excluded.last_status");
        
        for (const row of rows) {
          const [userName, projectName, task, manhours, status, uniqueId] = row;
          if (!uniqueId) continue; // Need a unique ID to track status changes

          const cached = getCache.get(uniqueId) as { last_status: string } | undefined;
          
          // Only log manhours if status changed to 'Completed'
          if (status === 'Completed' && (!cached || cached.last_status !== 'Completed')) {
            console.log(`Status changed to Completed for task ${uniqueId}. Logging ${manhours} hours.`);
            insertLog.run([userName, projectName, task, parseFloat(manhours) || 0]);
          }

          // Update cache
          setCache.run([uniqueId, status]);
        }

        db.prepare("UPDATE sync_settings SET last_sync = CURRENT_TIMESTAMP WHERE id = 1").run();
      }
    } catch (error: any) {
      // Avoid flooding logs with 1s interval errors unless they are persistent
      if (error.code !== 429) {
        console.error("Background Sync Error:", error.message);
      }
    }
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
