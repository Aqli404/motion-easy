@echo off
title Backup Kunci Privat - Motion Easy
rem Klik dua kali berkas ini untuk mencadangkan kunci lisensi.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup-kunci.ps1"
pause
