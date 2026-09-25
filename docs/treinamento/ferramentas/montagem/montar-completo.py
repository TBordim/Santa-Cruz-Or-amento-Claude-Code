# Monta o vídeo completo do Laboratório (cenas 1 a 15).
import json, os, re, subprocess, sys

FF, G, SAIDA = sys.argv[1], sys.argv[2], sys.argv[3]
M = os.path.dirname(os.path.abspath(__file__))
PREVIA = os.path.join(os.path.dirname(M), "previa")
os.chdir(M)
LEG = json.load(open("legendas-todas.json", encoding="utf-8"))
OFF, CAUDA = 0.3, 0.8
VCOD = ["-c:v", "libx264", "-profile:v", "high", "-level", "4.0", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30",
        "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2"]

def dur(a):
    o = subprocess.run([FF, "-hide_banner", "-i", a], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    h, m, s = re.search(r"Duration: (\d+):(\d+):([\d.]+)", o).groups(); return int(h) * 3600 + int(m) * 60 + float(s)

def ff(*a):
    r = subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", *a], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode: raise SystemExit(r.stderr[-2000:])

def ts(x): return f"{int(x // 3600)}:{int(x % 3600 // 60):02d}:{x % 60:05.2f}"

def ass(n, arq):
    cab = ("[Script Info]\nScriptType: v4.00+\nPlayResX: 1280\nPlayResY: 720\nWrapStyle: 2\n\n[V4+ Styles]\n"
           "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
           "Style: Leg,Segoe UI,24,&H00FFFFFF,&H00FFFFFF,&H30060C14,&H30060C14,-1,0,0,0,100,100,0,0,3,6,0,2,176,16,6,1\n\n[Events]\n"
           "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
    ev = "".join(f"Dialogue: 0,{ts(OFF + b['ini'])},{ts(OFF + b['fim'])},Leg,,0,0,0,,{{\\an2\\pos(720,712)}}{b['txt']}\n" for b in LEG[n]["blocos"])
    open(arq, "w", encoding="utf-8").write(cab + ev)

def audio_voz(i, D):
    return f"[{i}:a]adelay={int(OFF * 1000)}:all=1,aformat=sample_rates=48000:channel_layouts=stereo,apad,atrim=0:{D:.2f}[a]"

def seg_quadros(n, pasta, D):
    """Cena renderizada quadro a quadro (HTML) + voz."""
    ff("-framerate", "30", "-i", os.path.join(M, pasta, "%04d.jpg"), "-i", os.path.join(G, f"cena-{n}.mp3"),
       "-filter_complex", f"[0:v]scale=in_range=full:out_range=tv,format=yuv420p,setsar=1[v];{audio_voz(1, D)}",
       "-map", "[v]", "-map", "[a]", *VCOD, "-t", f"{D:.2f}", f"c-{n}.mp4")
    return f"c-{n}.mp4"

def seg_tela(n, tomada):
    """Gravação de tela acelerada até caber na voz, Santinho à esquerda e legenda na faixa."""
    voz = os.path.join(G, f"cena-{n}.mp3"); D = dur(voz) + CAUDA
    tom = os.path.join(G, f"lab-tomada-{tomada}.webm"); fator = (dur(tom) - 1.0) / D
    ass(n, f"c{n}.ass")
    ff("-ss", "1.0", "-i", tom, "-loop", "1", "-i", os.path.join(PREVIA, "santinho-200.png"), "-i", voz,
       "-filter_complex",
       f"color=c=0xF4EEE3:s=1280x720:r=30:d={D:.2f}[bg];"
       f"[0:v]setpts=(PTS-STARTPTS)/{fator:.4f},fps=30,scale=1088:612,setsar=1[t0];[t0]pad=1092:616:2:2:color=0xE3D3BD[t];"
       f"[bg][t]overlay=x=176:y=10:shortest=1[b1];[1:v]scale=165:165,format=rgba[s];"
       f"[b1][s]overlay=x=6:y='720-165-12+4*sin(2.4*t)':shortest=1[o];"
       f"[o]subtitles=c{n}.ass:fontsdir=C\\\\:/Windows/Fonts,format=yuv420p[v];{audio_voz(2, D)}",
       "-map", "[v]", "-map", "[a]", *VCOD, "-t", f"{D:.2f}", f"c-{n}.mp4")
    print(f"cena {n}: {D:.1f} s (tela {fator:.2f}x)")
    return f"c-{n}.mp4"

segs = []
# 01: abertura (vinheta, tornado, Santinho com nome) + fala da cena 1
ff("-framerate", "30", "-i", os.path.join(M, "fr-01", "%04d.jpg"), "-i", os.path.join(G, "som-abertura.wav"), "-i", os.path.join(G, "cena-01.mp3"),
   "-filter_complex", "[0:v]scale=in_range=full:out_range=tv,format=yuv420p,setsar=1[v];"
   "[2:a]adelay=5400:all=1,aformat=sample_rates=48000:channel_layouts=stereo[voz];[1:a]aformat=sample_rates=48000:channel_layouts=stereo[som];"
   "[som][voz]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95,apad,atrim=0:24.6[a]",
   "-map", "[v]", "-map", "[a]", *VCOD, "-t", "24.6", "c-01.mp4"); segs.append("c-01.mp4"); print("cena 01: 24.6 s (com abertura)")
segs.append("seg-02.mp4"); print(f"cena 02: {dur('seg-02.mp4'):.1f} s")
for n, t in [("03", "01"), ("04", "02"), ("05", "03"), ("06", "04"), ("07", "05")]: segs.append(seg_tela(n, t))
segs.append(seg_quadros("08", "fr-08", dur(os.path.join(G, "cena-08.mp3")) + CAUDA)); print("cena 08: zoom na bancada")
for n, t in [("09", "07"), ("10", "08"), ("11", "09"), ("12", "10")]: segs.append(seg_tela(n, t))
for n in ["13", "14", "15"]:
    D = dur(os.path.join(G, f"cena-{n}.mp3")) + (CAUDA if n != "15" else 0.3 + 3.4)   # 15: fala + fecho com o logo
    segs.append(seg_quadros(n, f"fr-{n}", D)); print(f"cena {n}: {D:.1f} s (quadros)")
ent, fc = [], ""
for i, s in enumerate(segs):
    ent += ["-i", s]; fc += f"[{i}:v]fps=30,scale=1280:720,setsar=1,format=yuv420p[v{i}];[{i}:a]aformat=sample_rates=48000:channel_layouts=stereo[a{i}];"
fc += "".join(f"[v{i}][a{i}]" for i in range(len(segs))) + f"concat=n={len(segs)}:v=1:a=1[v][a]"
ff(*ent, "-filter_complex", fc, "-map", "[v]", "-map", "[a]", *VCOD, "-movflags", "+faststart", SAIDA)
print(f"PRONTO: {SAIDA} ({dur(SAIDA):.1f} s)")
