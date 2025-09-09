#!/bin/bash

# Initialize git in the openai package directory
cd /Users/gavinpayne/Documents/Dev/GravityServer/services/gravity-services/packages/openai

# Initialize a new git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: OpenAI package v1.0.0"

# Add the gravityai-dev remote
git remote add origin https://github.com/gravityai-dev/openai.git

# Push to main branch
git branch -M main
git push -u origin main

echo "✅ OpenAI package pushed to gravityai-dev/openai repository"
