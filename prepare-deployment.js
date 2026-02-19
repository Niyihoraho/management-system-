#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Preparing deployment files...');

// Create deployment directory
const deployDir = path.join(process.cwd(), 'deployment');
if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir);
}

// Files and folders to include in deployment
const deploymentFiles = [
    '.next',
    'public', 
    'prisma',
    'package.json',
    'package-lock.json',
    'next.config.ts',
];

// Create .env.example for server setup
const envExample = `# Database Configuration
DATABASE_URL="mysql://username:password@host:port/database_name"

# NextAuth Configuration  
NEXTAUTH_URL="http://your-ec2-ip:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# JWT Configuration
JWT_SECRET="your-jwt-secret-here"

# Node Environment
NODE_ENV="production"
`;

fs.writeFileSync('.env.example', envExample);
console.log('✅ Created .env.example');

// Create deployment instructions
const instructions = `# Deployment Instructions

## Files to Upload to EC2:
${deploymentFiles.map(file => `- ${file}`).join('\n')}

## Commands to run on EC2 after upload:

1. Navigate to your app directory:
   cd /path/to/your/app

2. Copy .env.example to .env and configure:
   cp .env.example .env
   nano .env

3. Install production dependencies:
   npm ci --production

4. Generate Prisma Client:
   npx prisma generate

5. Start the application:
   npm run start

## Your app will be available at:
http://your-ec2-ip:3000
`;

fs.writeFileSync('DEPLOYMENT.md', instructions);
console.log('✅ Created DEPLOYMENT.md');

console.log('🎉 Deployment preparation complete!');
console.log('📁 Files ready for upload:', deploymentFiles);
