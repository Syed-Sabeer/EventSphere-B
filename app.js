const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const app = express();
require('dotenv').config();

// Middleware
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());

// Routes
const authRoutes = require('./authRoutes');
app.use('/api/auth', authRoutes);

const expoRoutes = require('./expoRoutes');
app.use('/api/expos', expoRoutes);

const boothRoutes = require('./boothRoutes');
const scheduleRoutes = require('./scheduleRoutes');
const exhibitorRoutes = require('./exhibitorRoutes');
const attendeeRoutes = require('./attendeeRoutes');
const feedbackRoutes = require('./feedbackRoutes');
app.use('/api/booths', boothRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/exhibitors', exhibitorRoutes);
app.use('/api/attendees', attendeeRoutes);
app.use('/api/feedback', feedbackRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
