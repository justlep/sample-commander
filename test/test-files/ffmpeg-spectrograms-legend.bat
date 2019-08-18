ffmpeg -y -hide_banner -i 20k-sweep-11k.wav -lavfi showspectrumpic=size=800x1024:color=fire:scale=log raw-spectrogram-11k-legend.png
ffmpeg -y -hide_banner -i 20k-sweep-22k.wav -lavfi showspectrumpic=size=800x1024:color=fire:scale=log raw-spectrogram-22k-legend.png
ffmpeg -y -hide_banner -i 20k-sweep-44k.wav -lavfi showspectrumpic=size=800x1024:color=fire:scale=log raw-spectrogram-44k-legend.png
ffmpeg -y -hide_banner -i 20k-sweep-48k.wav -lavfi showspectrumpic=size=800x1024:color=fire:scale=log raw-spectrogram-48k-legend.png
ffmpeg -y -hide_banner -i 20k-sweep-96k.wav -lavfi showspectrumpic=size=800x1024:color=fire:scale=log raw-spectrogram-96k-legend.png
ffmpeg -y -hide_banner -i 20k-sweep-192k.wav -lavfi showspectrumpic=size=800x1024:color=fire:scale=log raw-spectrogram-192k-legend.png
