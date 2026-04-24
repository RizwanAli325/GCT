import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, 'uploads');
await fs.mkdir(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

const upload = multer({ storage: multer.memoryStorage() });

// In-memory data store
let registrations = [];
let nextId = 1;

app.post('/api/registrations', upload.fields([
  { name: 'photo1' },
  { name: 'photo2' },
  { name: 'photo3' },
  { name: 'photo4' },
  { name: 'photo5' },
  { name: 'photo6' },
  { name: 'photo7' },
  { name: 'photo8' }
]), async (req, res) => {
  const { teamName, userEmail, player1, player2, player3, player4, player5, player6, player7, player8 } = req.body;
  const players = [player1, player2, player3, player4, player5, player6, player7, player8];
  if (!teamName || players.some(p => !p)) {
    return res.status(400).json({ error: 'Team name and 8 player names are required.' });
  }

  const trimmedPlayers = players.map((name) => String(name || '').trim()).filter(Boolean);
  if (trimmedPlayers.length !== 8) {
    return res.status(400).json({ error: 'Please provide eight valid player names.' });
  }

  try {
    const photoUrls = [];
    for (let i = 1; i <= 8; i++) {
      const file = req.files[`photo${i}`]? req.files[`photo${i}`][0] : null;
      if (!file) {
        return res.status(400).json({ error: 'All 8 photos are required.' });
      }
      const extension = file.mimetype.split('/')[1] || 'jpg';
      const filename = `photo${i}-${Date.now()}.${extension}`;
      const filepath = path.join(uploadDir, filename);
      await fs.writeFile(filepath, file.buffer);
      photoUrls.push(filename);
    }

    const registration = {
      id: nextId++,
      teamName: teamName.trim(),
      userEmail: userEmail || '',
      players: trimmedPlayers,
      photos: photoUrls,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    registrations.push(registration);
    res.status(201).json({ id: registration.id, status: 'pending' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to save registration.' });
  }
});

app.get('/api/registrations', (req, res) => {
  try {
    const sorted = [...registrations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(sorted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to fetch registrations.' });
  }
});

app.post('/api/registrations/:id/decision', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Decision must be approved or rejected.' });
  }

  try {
    const registration = registrations.find((r) => r.id === Number(id));
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found.' });
    }
    registration.status = status;
    res.json({ id: Number(id), status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to apply decision.' });
  }
});

app.delete('/api/registrations/:id', (req, res) => {
  const { id } = req.params;
  try {
    const index = registrations.findIndex((r) => r.id === Number(id));
    if (index === -1) {
      return res.status(404).json({ error: 'Registration not found.' });
    }
    registrations.splice(index, 1);
    res.json({ id: Number(id), message: 'Registration deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to delete registration.' });
  }
});

app.get('/api/registrations/:id', (req, res) => {
  const { id } = req.params;
  try {
    const registration = registrations.find((r) => r.id === Number(id));
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found.' });
    }
    res.json(registration);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to fetch registration.' });
  }
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
