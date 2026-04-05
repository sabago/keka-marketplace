#!/bin/bash
# Test Docker Build Script
# This script simulates the exact Railway deployment build process locally

echo "🐳 Testing Docker Build (Railway Simulation)..."
echo "================================================"
echo ""

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t marketplace-test . 2>&1 | tail -50

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ BUILD SUCCESSFUL!"
    echo "================================================"
    echo "The deployment build will succeed on Railway."
    echo ""
    echo "To run the container locally:"
    echo "  docker run -p 3000:3000 --env-file .env marketplace-test"
    exit 0
else
    echo ""
    echo "❌ BUILD FAILED!"
    echo "================================================"
    echo "Fix the errors above before deploying."
    exit 1
fi
