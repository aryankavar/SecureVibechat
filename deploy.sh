#!/bin/bash

# 🚀 Firebase Deployment Script
# This script builds and deploys your app to Firebase Hosting

echo "🚀 Starting deployment process..."
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null
then
    echo "❌ Firebase CLI not found!"
    echo "📦 Installing Firebase CLI..."
    npm install -g firebase-tools
fi

# Check if logged in to Firebase
echo "🔑 Checking Firebase authentication..."
firebase projects:list &> /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Not logged in to Firebase"
    echo "🔐 Please login..."
    firebase login
fi

# Build the app
echo ""
echo "🏗️  Building production app..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Ask what to deploy
echo "What would you like to deploy?"
echo "1) Everything (Hosting + Firestore Rules)"
echo "2) Hosting only"
echo "3) Firestore rules only"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Deploying everything..."
        firebase deploy
        ;;
    2)
        echo ""
        echo "🚀 Deploying hosting only..."
        firebase deploy --only hosting
        ;;
    3)
        echo ""
        echo "🚀 Deploying Firestore rules only..."
        firebase deploy --only firestore:rules
        ;;
    *)
        echo "❌ Invalid choice!"
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🌐 Your app is live at:"
    echo "   https://vibelockchat.web.app"
    echo ""
    echo "📊 View console:"
    echo "   https://console.firebase.google.com/project/vibelockchat"
    echo ""
else
    echo ""
    echo "❌ Deployment failed!"
    echo "Check the error messages above."
    exit 1
fi
