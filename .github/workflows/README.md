# 📱 LittleForest APK Build Automation

This GitHub Action automatically builds your LittleForest nursery management app into an Android APK whenever you push code changes.

## 🚀 How it works

1. **Automatic builds** - APK is built on every push to main/master branch
2. **Manual builds** - You can trigger a build anytime from GitHub Actions tab
3. **Download links** - Get APK download links in two ways:
   - **Artifacts** (temporary): Go to Actions tab → Latest run → Download artifacts
   - **Releases** (permanent): Go to Releases section → Download latest APK

## 🔧 Setup Required

To use this automation, you need to add one secret to your GitHub repository:

1. Go to your repository → Settings → Secrets and variables → Actions
2. Add a new secret called `EXPO_TOKEN`
3. Get your token from: https://expo.dev/accounts/[username]/settings/access-tokens
4. Create a new token and paste it as the secret value

## 📱 Installing the APK

1. Download the APK from the Releases section
2. On your Android device, enable "Install from unknown sources"
3. Install the downloaded APK
4. Open LittleForest app and start managing your nursery!

## ⚡ Quick Build

Want to build an APK right now? 
1. Go to the "Actions" tab in your repository
2. Click "Build Android APK" workflow
3. Click "Run workflow" button
4. Wait for build to complete (~5-10 minutes)
5. Download your APK from the completed run!