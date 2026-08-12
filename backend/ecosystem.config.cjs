module.exports = {
  apps: [
    {
      name: 'hrms-backend',
      script: 'server.js',
      instances: '1',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        // Make sure to add your MongoDB connection string when running on EC2
        // DB_URI: 'your-mongodb-atlas-uri',
        // JWT_SECRET: 'your-production-secret'
      }
    }
  ]
};
