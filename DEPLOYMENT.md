# 🚀 Deployment Guide - SecureVibe Chat

Complete step-by-step deployment instructions for various platforms.

## 📋 Pre-Deployment Checklist

- [ ] Firebase project created and configured
- [ ] Firestore security rules added
- [ ] Environment variables configured
- [ ] Application tested locally
- [ ] Build process verified (`npm run build`)

## 🔥 Firebase Hosting (Recommended)

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase

```bash
firebase login
```

### Step 3: Initialize Firebase in Your Project

```bash
firebase init
```

Select:
- **Hosting**: Configure files for Firebase Hosting
- Use existing project (select your Firebase project)
- Public directory: `dist`
- Single-page app: `Yes`
- Automatic builds with GitHub: `No` (or Yes if you want CI/CD)

### Step 4: Build Your Application

```bash
npm run build
```

### Step 5: Deploy

```bash
firebase deploy --only hosting
```

Your app will be live at: `https://your-project-id.web.app`

### Step 6: Add Environment Variables

Since Firebase Hosting doesn't support environment variables at runtime, you need to:

1. Create a production `.env` file
2. Build with production variables
3. Deploy the built files

**Alternative**: Use Firebase Functions to serve environment variables securely.

---

## ▲ Vercel Deployment

### Option 1: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Build the project
npm run build

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Option 2: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Configure:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add environment variables in Settings → Environment Variables
6. Deploy

### Environment Variables in Vercel

Add these in the Vercel dashboard:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_ENCRYPTION_SECRET
```

---

## 🌐 Netlify Deployment

### Option 1: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build the project
npm run build

# Deploy
netlify deploy

# Deploy to production
netlify deploy --prod
```

### Option 2: Netlify Dashboard

1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your Git repository
4. Configure:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables in Site settings → Environment variables
6. Deploy

### netlify.toml Configuration

Create `netlify.toml` in your project root:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 🐙 GitHub Pages

### Step 1: Install gh-pages

```bash
npm install --save-dev gh-pages
```

### Step 2: Update package.json

Add these scripts:

```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  },
  "homepage": "https://yourusername.github.io/securevibe-chat"
}
```

### Step 3: Update vite.config.js

```javascript
export default defineConfig({
  plugins: [react()],
  base: '/securevibe-chat/', // Your repo name
  server: {
    port: 3000
  }
})
```

### Step 4: Deploy

```bash
npm run deploy
```

**Note**: GitHub Pages doesn't support environment variables. You'll need to hardcode them (not recommended for production) or use a different hosting solution.

---

## 🐳 Docker Deployment

### Dockerfile

Create `Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### Build and Run

```bash
# Build Docker image
docker build -t securevibe-chat .

# Run container
docker run -p 8080:80 securevibe-chat
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

Run with:

```bash
docker-compose up -d
```

---

## ☁️ AWS S3 + CloudFront

### Step 1: Build the Application

```bash
npm run build
```

### Step 2: Create S3 Bucket

```bash
aws s3 mb s3://securevibe-chat
```

### Step 3: Upload Files

```bash
aws s3 sync dist/ s3://securevibe-chat --delete
```

### Step 4: Configure S3 for Static Hosting

```bash
aws s3 website s3://securevibe-chat \
  --index-document index.html \
  --error-document index.html
```

### Step 5: Create CloudFront Distribution

1. Go to AWS CloudFront console
2. Create distribution
3. Origin: Your S3 bucket
4. Default root object: `index.html`
5. Error pages: 404 → /index.html (for SPA routing)

---

## 🔒 Environment Variables Security

### Production Best Practices

1. **Never commit `.env` files**
2. **Use platform-specific environment variable management**
3. **Rotate secrets regularly**
4. **Use different secrets for different environments**

### Secure Environment Variable Storage

For sensitive data, consider:

- **AWS Secrets Manager**
- **HashiCorp Vault**
- **Azure Key Vault**
- **Google Cloud Secret Manager**

---

## 📊 Post-Deployment

### 1. Test Your Deployment

- [ ] Sign up works
- [ ] Login works
- [ ] Messages send and receive
- [ ] Encryption/decryption works
- [ ] Dark mode toggles
- [ ] Profile updates work
- [ ] Responsive on mobile

### 2. Monitor Your Application

Set up monitoring with:
- Firebase Analytics
- Google Analytics
- Sentry for error tracking
- LogRocket for session replay

### 3. Set Up CI/CD

Example GitHub Actions workflow (`.github/workflows/deploy.yml`):

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
          VITE_ENCRYPTION_SECRET: ${{ secrets.VITE_ENCRYPTION_SECRET }}
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: your-project-id
```

---

## 🆘 Troubleshooting

### Build Fails

```bash
# Clear cache
rm -rf node_modules dist .vite
npm install
npm run build
```

### Environment Variables Not Working

- Check variable names start with `VITE_`
- Restart dev server after changing `.env`
- Rebuild for production deployments

### Firebase Connection Issues

- Verify Firebase config in `.env`
- Check Firestore rules
- Ensure Firebase project is active

---

## 📞 Support

For deployment issues:
1. Check the error logs
2. Review Firebase console
3. Check hosting platform documentation
4. Open an issue on GitHub

---

**Happy Deploying! 🚀**
