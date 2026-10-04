require('dotenv').config({ quiet: true });

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    console.error('MONGODB_URI and JWT_SECRET must be set in your .env file');
    process.exit(1);
  }

  try {
    await connectDB();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
