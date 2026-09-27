# 🩸 HemaSight AI

> AI-powered leukemia detection and monitoring platform

![Status](https://img.shields.io/badge/status-active-success)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Python](https://img.shields.io/badge/Python-3.11-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 📋 Overview

HemaSight AI is an end-to-end platform for early leukemia detection using a
four-stage AI workflow. It combines XGBoost, conditional GANs, time-series
analysis, and multilingual AI to assist both patients and hematologists.

## 🎯 The Four-Stage Workflow

| Stage | Purpose | Tech |
|---|---|---|
| 1. **XGBoost Screening** | Analyzes CBC values, flags abnormalities | XGBoost + FastAPI |
| 2. **cGAN Visualization** | Generates synthetic microscopic images + finds dataset matches | PyTorch + ResNet18 |
| 3. **Relapse Monitoring** | Detects early "silent" relapse via trend analysis | Pandas + SciPy |
| 4. **AI Chatbot** | Explains findings in 7 languages | Google Gemini |

## ✨ Features

- 🔐 Patient authentication (Supabase Auth)
- 🔬 Blood test screening with 17+ parameters
- 📷 **OCR upload** — auto-fill from a photo of a lab report
- 🧬 Wright-Giemsa microscopic image rendering
- 📊 Similarity search against blood cell dataset
- 📈 Longitudinal relapse monitoring with charts
- 💬 Multilingual AI chatbot (English, Hindi, Telugu, Tamil, Kannada, Spanish, French)
- 📄 Clinical PDF report generation
- 🌗 Dark / Light theme
- 📱 Fully responsive

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11
- Supabase project (free)

### Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local   # add your Supabase keys
npm run dev                        # http://localhost:3000
# XGBoost
cd backend/xgboost-api
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --port 7860

# cGAN
cd backend/cgan-api
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --port 7861

# Timeseries
cd backend/timeseries-api
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --port 7862

# Chatbot
cd backend/chatbot-api
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
echo "GEMINI_API_KEY=your-key-here" > .env
uvicorn app:app --port 7863

