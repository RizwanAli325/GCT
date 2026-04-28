import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import mongoose from 'mongoose';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cricket_registration';

const registrationSchema = new mongoose.Schema({
  teamName: { type: String, required: true },
  userEmail: { type: String, default: '' },
  players: { type: [String], required: true },
  photos: { type: [String], required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const Registration = mongoose.models.Registration || mongoose.model('Registration', registrationSchema);

let connectPromise;

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!connectPromise) {
    connectPromise = mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
  }

  await connectPromise;
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

function bufferToDataUrl(file) {
  const mimeType = file.mimetype || 'image/jpeg';
  return `data:${mimeType};base64,${file.buffer.toString('base64')}`;
}

async function createRegistration(data) {
  const saved = await new Registration(data).save();
  return normalizeRegistration(saved);
}

async function getRegistrations() {
  const data = await Registration.find().sort({ createdAt: -1 });
  return data.map(normalizeRegistration);
}

async function getRegistrationById(id) {
  const data = await Registration.findById(id);
  return data ? normalizeRegistration(data) : null;
}

async function updateRegistrationStatus(id, status) {
  const updated = await Registration.findByIdAndUpdate(id, { status }, { new: true });
  return updated ? normalizeRegistration(updated) : null;
}

async function deleteRegistration(id) {
  const deleted = await Registration.findByIdAndDelete(id);
  return deleted ? normalizeRegistration(deleted) : null;
}

async function withDatabase(handler) {
  await connectDatabase();
  return handler();
}

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
    await withDatabase(async () => {
      const { teamName, userEmail, player1, player2, player3, player4, player5, player6, player7, player8 } = req.body;

      const players = [player1, player2, player3, player4, player5, player6, player7, player8];

      if (!teamName || players.some((player) => !player)) {
        return res.status(400).json({ error: 'Team name and 8 player names are required.' });
      }

      const trimmedPlayers = players.map((player) => String(player).trim()).filter(Boolean);
      if (trimmedPlayers.length !== 8) {
        return res.status(400).json({ error: 'Provide exactly 8 valid players.' });
      }

      const photoUrls = [];

      for (let index = 1; index <= 8; index++) {
        const file = req.files[`photo${index}`]?.[0];
        if (!file) {
          return res.status(400).json({ error: 'All 8 photos are required.' });
        }

        photoUrls.push(bufferToDataUrl(file));
      }

      const saved = await createRegistration({
        teamName: teamName.trim(),
        userEmail: userEmail || '',
        players: trimmedPlayers,
        photos: photoUrls,
        status: 'pending'
      });

      return res.status(201).json({
        id: saved.id,
        status: saved.status
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to save registration.' });
  }
});

app.get('/api/registrations', async (req, res) => {
  try {
    await withDatabase(async () => {
      const data = await getRegistrations();
      res.json(data);
    });
  } catch (error) {
    res.status(500).json({ error: 'Fetch error' });
  }
});

app.get('/api/registrations/:id', async (req, res) => {
  try {
    await withDatabase(async () => {
      const data = await getRegistrationById(req.params.id);
      if (!data) return res.status(404).json({ error: 'Not found' });
      res.json(data);
    });
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
    await withDatabase(async () => {
      const updated = await updateRegistrationStatus(req.params.id, status);

      if (!updated) return res.status(404).json({ error: 'Not found' });

      res.json(updated);
    });
  } catch {
    res.status(500).json({ error: 'Update error' });
  }
});

app.delete('/api/registrations/:id', async (req, res) => {
  try {
    await withDatabase(async () => {
      const deleted = await deleteRegistration(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Not found' });

      res.json({ message: 'Deleted successfully' });
    });
  } catch {
    res.status(500).json({ error: 'Delete error' });
  }
});

export default app;
