from __future__ import unicode_literals
import time
import sys
sys.path.insert(0, "/home/pi/.local/lib/python3.9/site-packages")
import yt_dlp
import ffmpeg
import os

# Ruta de la carpeta hija
output_folder = 'wavs'

args = sys.argv[1:]

# Asegúrate de que la carpeta existe o créala si es necesario
if not os.path.exists(output_folder):
    os.makedirs(output_folder)

ydl_opts = {
    'format': 'bestaudio/best',
    'outtmpl': os.path.join(output_folder, f'{args[1]}.%(ext)s'),  # Ruta de salida en la carpeta hija
    'postprocessors': [{
        'key': 'FFmpegExtractAudio',
        'preferredcodec': 'wav',
    }],
}

def download_from_url(url):
    ydl.download([url])
    stream = ffmpeg.input(os.path.join(output_folder, f'{args[1]}output.m4a'))
    stream = ffmpeg.output(stream, os.path.join(output_folder, f'{args[1]}output.wav'))

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    
    if len(args) > 2:
        print("Demasiados argumentos.")
        print("Uso: python youtubetowav.py <enlace opcional>")
        print("Si se proporciona un enlace, se convertirá automáticamente a .wav. De lo contrario, se mostrará un mensaje.")
        exit()
    if len(args) == 0:
        url = input("Ingresa el enlace de YouTube: ")
        download_from_url(url)
    else:
        download_from_url(args[0])
        print('finished')





