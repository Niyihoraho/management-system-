# 🚀 DEPLOYMENT GUIDE
## GBUR Ministry Management System

## 📋 What You Need Before Starting

✅ **Your Windows Computer** (where you develop)  
✅ **EC2 Server** (98.90.202.108)  
✅ **PEM Key File** (m-system-WebServer-1.pem)  
✅ **Database** (MySQL RDS already set up)  

## 🎯 How This Works

1. **Build on your computer** (fast and reliable)
2. **Upload to server** (only the final files)
3. **Run on server** (no installation needed)

## 🚀 STEP-BY-STEP DEPLOYMENT

### Step 1: Open PowerShell in Your Project Folder
1. Navigate to your project folder: `C:\Users\user\Music\github\m-system`
2. Right-click in the folder and select "Open PowerShell here"

### Step 2: Choose Your Deployment Method

#### Option A: Smart Deployment (Recommended)
```powershell
.\deploy-smart.ps1
```
*This automatically detects what changed and chooses the best method*

#### Option B: Full Deployment (For major changes)
```powershell
.\deploy.ps1
```
*Use this when you change config files or add new features*

#### Option C: Quick Update (For code changes only)
```powershell
.\deploy-update.ps1
```
*Use this for small fixes and updates*

### Step 3: Wait for Upload to Complete
The script will:
- ✅ Install dependencies
- ✅ Build your app
- ✅ Create deployment package
- ✅ Upload to server
- ✅ Show you the server commands to run

### Step 4: Run Server Commands
Copy and paste the commands shown in PowerShell into your server terminal:

**For Full Deployment:**
```bash
pm2 stop my-app && pm2 delete my-app && rm -rf app && mkdir app && cd app && unzip -o ~/deployment.zip && sudo chown -R ec2-user:ec2-user /home/ec2-user/app && chmod -R 755 . && pm2 start ecosystem.config.js && pm2 save && rm ~/deployment.zip && pm2 status
```

**For Quick Update:**
```bash
pm2 stop my-app && cd app && unzip -o ~/update.zip && sudo chown -R ec2-user:ec2-user /home/ec2-user/app && chmod -R 755 . && pm2 start ecosystem.config.js && pm2 save && rm ~/update.zip && pm2 status
```

### Step 5: Check Your App
1. Open browser
2. Go to: http://98.90.202.108:3000
3. Test login and features

## 🛠️ WHEN TO USE EACH DEPLOYMENT METHOD

### Use Smart Deployment (deploy-smart.ps1) - **MOST OF THE TIME**
- ✅ When you make any changes
- ✅ It automatically chooses the best method
- ✅ Just run: `.\deploy-smart.ps1`

### Use Full Deployment (deploy.ps1) - **MAJOR CHANGES**
- ✅ When you add new features
- ✅ When you change config files
- ✅ When you update dependencies
- ✅ When something is broken

### Use Quick Update (deploy-update.ps1) - **SMALL FIXES**
- ✅ When you fix bugs
- ✅ When you update text or styling
- ✅ When you make small changes

## 🚨 TROUBLESHOOTING

### If Deployment Fails:
1. **Check your internet connection**
2. **Make sure PEM file is in the right place**
3. **Try full deployment instead**: `.\deploy.ps1`

### If App Doesn't Work After Deployment:
1. **Check server commands ran successfully**
2. **Check PM2 status**: `pm2 status`
3. **Check logs**: `pm2 logs my-app`
4. **Try restarting**: `pm2 restart my-app`

### If Login Doesn't Work:
1. **Check database connection**
2. **Verify credentials in ecosystem.config.js**
3. **Check NEXTAUTH_URL is correct**

## ✅ SUCCESS CHECKLIST

After deployment, verify:
- [ ] App loads at http://98.90.202.108:3000
- [ ] Login form appears
- [ ] You can log in with your credentials
- [ ] Dashboard loads after login
- [ ] All features work as expected

## 🎉 THAT'S IT!

You now have a simple, step-by-step guide to deploy your GBUR Ministry Management System.

### 🌐 Your App URL:
**http://98.90.202.108:3000**

### 📞 Quick Help:
- **Most of the time**: Use `.\deploy-smart.ps1`
- **If something breaks**: Use `.\deploy.ps1`
- **For small fixes**: Use `.\deploy-update.ps1`

### 🚀 Remember:
1. Open PowerShell in your project folder
2. Run the deployment script
3. Copy the server commands to your server
4. Check your app at the URL above

**Happy Deploying!** 🎯
