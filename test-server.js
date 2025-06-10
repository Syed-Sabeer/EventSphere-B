const express = require('express');
const app = express();

// Simple test route
app.get('/', (req, res) => {
    res.json({ message: 'Test server is working' });
});

app.get('/test/:id', (req, res) => {
    res.json({ id: req.params.id });
});

const PORT = 5001;
app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
}); 