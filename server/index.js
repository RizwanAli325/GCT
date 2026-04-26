import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Fix __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Upload folder
const uploadDir = path.join(__dirname, 'uploads');
const registrationsFile = path.join(__dirname, 'registrations.json');

// Multer setup
const upload = multer({ storage: multer.memoryStorage() });

// MongoDB URI
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cricket_registration';

// Schema
const registrationSchema = new mongoose.Schema({
  teamName: { type: String, required: true },
  userEmail: { type: String, default: '' },
  players: { type: [String], required: true },
  photos: { type: [String], required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const Registration = mongoose.model('Registration', registrationSchema);

let useMongo = false;

async function readRegistrationsFromFile() {
  try {
    const raw = await fs.readFile(registrationsFile, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(registrationsFile, '[]', 'utf-8');
      return [];
    }
    throw error;
  }
}

async function writeRegistrationsToFile(registrations) {
  await fs.writeFile(registrationsFile, JSON.stringify(registrations, null, 2), 'utf-8');
}

function normalizeRegistration(registration) {
  return {
    id: registration._id ? String(registration._id) : String(registration.id),
    teamName: registration.teamName,
    userEmail: registration.userEmail || '',
    players: registration.players,
    photos: registration.photos,
    status: registration.status,
    createdAt: registration.createdAt
  };
}

async function createRegistration(data) {
  if (useMongo) {
    const saved = await new Registration(data).save();
    return normalizeRegistration(saved);
  }

  const registrations = await readRegistrationsFromFile();
  const maxId = registrations.reduce((max, item) => {
    const current = Number(item.id) || 0;
    return current > max ? current : max;
  }, 0);

  const newRegistration = {
    id: maxId + 1,
    teamName: data.teamName,
    userEmail: data.userEmail || '',
    players: data.players,
    photos: data.photos,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  registrations.unshift(newRegistration);
  await writeRegistrationsToFile(registrations);
  return normalizeRegistration(newRegistration);
}

async function getRegistrations() {
  if (useMongo) {
    const data = await Registration.find().sort({ createdAt: -1 });
    return data.map(normalizeRegistration);
  }

  const data = await readRegistrationsFromFile();
  return data
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(normalizeRegistration);
}

async function getRegistrationById(id) {
  if (useMongo) {
    const data = await Registration.findById(id);
    return data ? normalizeRegistration(data) : null;
  }

  const registrations = await readRegistrationsFromFile();
  const found = registrations.find((item) => String(item.id) === String(id));
  return found ? normalizeRegistration(found) : null;
}

async function updateRegistrationStatus(id, status) {
  if (useMongo) {
    const updated = await Registration.findByIdAndUpdate(id, { status }, { new: true });
    return updated ? normalizeRegistration(updated) : null;
  }

  const registrations = await readRegistrationsFromFile();
  const index = registrations.findIndex((item) => String(item.id) === String(id));
  if (index === -1) return null;

  registrations[index] = { ...registrations[index], status };
  await writeRegistrationsToFile(registrations);
  return normalizeRegistration(registrations[index]);
}

async function deleteRegistration(id) {
  if (useMongo) {
    const deleted = await Registration.findByIdAndDelete(id);
    return deleted ? normalizeRegistration(deleted) : null;
  }

  const registrations = await readRegistrationsFromFile();
  const index = registrations.findIndex((item) => String(item.id) === String(id));
  if (index === -1) return null;

  const [deleted] = registrations.splice(index, 1);
  await writeRegistrationsToFile(registrations);
  return normalizeRegistration(deleted);
}


// ================= START SERVER =================
const startServer = async () => {
  try {
    // Create upload folder
    await fs.mkdir(uploadDir, { recursive: true });

    // Static folder
    app.use('/uploads', express.static(uploadDir));

    // Connect MongoDB (fallback to file storage if unavailable)
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
      useMongo = true;
      console.log('MongoDB connected');
    } catch (error) {
      useMongo = false;
      await readRegistrationsFromFile();
      console.warn('MongoDB unavailable, using registrations.json file storage');
      console.warn(error.message);
    }

    // ================= ROUTES =================

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
      try {
        const { teamName, userEmail, player1, player2, player3, player4, player5, player6, player7, player8 } = req.body;

        const players = [player1, player2, player3, player4, player5, player6, player7, player8];

        if (!teamName || players.some(p => !p)) {
          return res.status(400).json({ error: 'Team name and 8 player names are required.' });
        }

        const trimmedPlayers = players.map(p => String(p).trim()).filter(Boolean);
        if (trimmedPlayers.length !== 8) {
          return res.status(400).json({ error: 'Provide exactly 8 valid players.' });
        }

        const photoUrls = [];

        for (let i = 1; i <= 8; i++) {
          const file = req.files[`photo${i}`]?.[0];
          if (!file) {
            return res.status(400).json({ error: 'All 8 photos are required.' });
          }

          const ext = file.mimetype.split('/')[1] || 'jpg';
          const filename = `photo${i}-${Date.now()}.${ext}`;
          const filepath = path.join(uploadDir, filename);

          await fs.writeFile(filepath, file.buffer);
          photoUrls.push(filename);
        }

        const saved = await createRegistration({
          teamName: teamName.trim(),
          userEmail: userEmail || '',
          players: trimmedPlayers,
          photos: photoUrls
        });

        res.status(201).json({
          id: saved.id,
          status: saved.status
        });

      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Unable to save registration.' });
      }
    });


    app.get('/api/registrations', async (req, res) => {
      try {
        const data = await getRegistrations();
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: 'Fetch error' });
      }
    });


    app.get('/api/registrations/:id', async (req, res) => {
      try {
        const data = await getRegistrationById(req.params.id);
        if (!data) return res.status(404).json({ error: 'Not found' });
        res.json(data);
      } catch {
        res.status(500).json({ error: 'Error' });
      }
    });


    app.post('/api/registrations/:id/decision', async (req, res) => {
      const { status } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      try {
        const updated = await updateRegistrationStatus(req.params.id, status);

        if (!updated) return res.status(404).json({ error: 'Not found' });

        res.json(updated);
      } catch {
        res.status(500).json({ error: 'Update error' });
      }
    });


    app.delete('/api/registrations/:id', async (req, res) => {
      try {
        const deleted = await deleteRegistration(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Not found' });

        res.json({ message: 'Deleted successfully' });
      } catch {
        res.status(500).json({ error: 'Delete error' });
      }
    });


    // ================= START LISTEN =================
    const port = process.env.PORT || 4000;
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });

  } catch (error) {
    console.error("Startup error:", error);
  }
};

startServer();


// Graceful shutdown
process.on('SIGINT', async () => {
  if (useMongo) {
    await mongoose.disconnect();
  }
  process.exit(0);
});