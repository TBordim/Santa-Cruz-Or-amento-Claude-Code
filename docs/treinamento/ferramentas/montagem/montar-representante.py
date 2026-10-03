# Monta o vídeo do Representante (Novo Orçamento em 1 minuto, 02/10/2026).
#
#   python montar-representante.py <ffmpeg> <pasta-de-trabalho> <saida.mp4>
#
# A pasta de trabalho precisa ter:
#   quadros/            abertura express renderizada (ferramentas/abertura/renderizar-express.mjs), 8,92 s a 30 fps
#   rep-tomada-01.webm  e  rep-marcas.json    gravação de tela (ferramentas/gravar-representante.mjs)
#   rep.json            tempo de cada palavra da voz (montagem/transcrever.py sobre a narração)
#   voz.mp3             narração (ElevenLabs)
#   som-abertura.wav    som de entrada (os primeiros 5,4 s são usados)
#   santinho-200.png, santinho-420.png, logo.png
#
# Linha do tempo (segundos de vídeo; tv = segundos da narração): a voz entra aos 2,6 s (TV). O vídeo tem três partes:
#   A  0 a V(6,32)            abertura express + cena 1 (Santinho em tela cheia)
#   B  V(6,32) a V(48,42)     cenas 2 a 6: a tela gravada (login acelerado/esticado para caber na cena 2; o resto em 1,0x,
#                             já gravado no ritmo da voz), com o Santinho na coluna da esquerda
#   C  V(48,42) até o fim     cena 7: Santinho grande + logo
# A voz fica CONTÍNUA (sem a folga de 0,8 s por cena do vídeo do Laboratório), para fechar abaixo de 1 minuto.
import difflib, glob, json, math, os, re, subprocess, sys, textwrap, unicodedata

FF, W, SAIDA = sys.argv[1:4]
os.chdir(W)
TV = 2.6
V = lambda tv: TV + tv
FIM_VOZ = 51.20                  # fim da fala (tv)
CAUDA = 1.4                      # respiro depois da última palavra
D = V(FIM_VOZ + CAUDA)           # duração total
T_CENA2, T_CENA3, T_TROCA = 6.32, 10.48, 48.42
VCOD = ["-c:v", "libx264", "-profile:v", "high", "-level", "4.0", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30"]
ACOD = ["-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2"]


def dur(a):
    o = subprocess.run([FF, "-hide_banner", "-i", a], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    h, m, s = re.search(r"Duration: (\d+):(\d+):([\d.]+)", o).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


def ff(*a):
    r = subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", *a], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode:
        raise SystemExit(r.stderr[-2500:])


def ts(x):
    return f"{int(x // 3600)}:{int(x % 3600 // 60):02d}:{x % 60:05.2f}"


# ---------- legendas (frases do texto alinhadas às palavras da voz) ----------
def norm(p):
    p = unicodedata.normalize("NFD", p.lower())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in p if unicodedata.category(c) != "Mn"))


def duas_linhas(txt):
    if len(txt) <= 42:
        return txt
    ps = txt.split()
    k = min(range(1, len(ps)), key=lambda i: abs(len(" ".join(ps[:i])) - len(" ".join(ps[i:]))))
    return " ".join(ps[:k]) + "\\N" + " ".join(ps[k:])


def partir(txt, mx=84):
    n = math.ceil(len(txt) / mx)
    if n <= 1:
        return [txt]
    alvo, out, cur = len(txt) / n, [], []
    for w in txt.split():
        cur.append(w)
        if len(" ".join(cur)) >= alvo and len(out) < n - 1:
            out.append(" ".join(cur)); cur = []
    if cur:
        out.append(" ".join(cur))
    return out


def frases(texto, mx=84):
    pecas = []
    for f in [f.strip() for f in re.split(r"(?<=[.!?])\s+", texto) if f.strip()]:
        cur = ""
        for c in [c.strip() for c in re.split(r"(?<=[,:])\s+", f) if c.strip()]:
            if cur and len(cur) + 1 + len(c) <= mx:
                cur += " " + c
            else:
                if cur:
                    pecas += partir(cur)
                cur = c
        if cur:
            pecas += partir(cur)
    return pecas


def blocos(texto, palavras):
    pecas = frases(texto)
    meus = [norm(w) for p in pecas for w in p.split()]
    nw = [norm(p["w"]) for p in palavras]
    mapa = {}
    for a, b, n in difflib.SequenceMatcher(None, meus, nw, autojunk=False).get_matching_blocks():
        for k in range(n):
            mapa[a + k] = b + k
    ch = sorted(mapa)

    def tempo(k, fim):
        if k in mapa:
            return palavras[mapa[k]]["fim" if fim else "ini"]
        ant = max((j for j in ch if j < k), default=None)
        prox = min((j for j in ch if j > k), default=None)
        if ant is None and prox is None:
            return palavras[0]["ini"]
        if ant is None:
            return palavras[mapa[prox]]["ini"]
        if prox is None:
            return palavras[mapa[ant]]["fim"]
        a, b = palavras[mapa[ant]]["fim"], palavras[mapa[prox]]["ini"]
        return a + (b - a) * (k - ant) / (prox - ant)

    out, pos = [], 0
    for p in pecas:
        n = len(p.split())
        out.append({"ini": tempo(pos, False), "fim": tempo(pos + n - 1, True), "txt": duas_linhas(p)})
        pos += n
    for i in range(len(out) - 1):
        out[i]["fim"] = min(out[i]["fim"], out[i + 1]["ini"] - 0.03)
    return out


TEXTOS = [
    ("olá", "Olá! Eu sou o Santinho. Em um minuto, você aprende a pedir um orçamento!"),
    ("entre", "Entre com seu nome e seu PIN: o Novo Orçamento já abre."),
    ("comece", "Comece pelo cliente: digite o nome ou o CNPJ, e escolha na lista. Se ele for novo, clique em cadastrar novo."),
    ("informe", "Informe quantas entregas e a data que o cliente pediu. Depois, descreva o produto e coloque as quantidades a orçar."),
    ("preencha", "Preencha os detalhes técnicos: medidas, material, acabamento. Quanto mais informação, mais rápido sai o orçamento. Sem isso, a Engenharia precisa levantar, e atrasa."),
    ("pronto", "Pronto! Clique em Enviar solicitação, e a Santa Cruz segue daqui."),
    ("foi", "Foi rápido, né? Bons negócios!"),
]
palavras = json.load(open("rep.json", encoding="utf-8"))
inicios = []
for chave, _ in TEXTOS:
    inicios.append(next(i for i, p in enumerate(palavras) if norm(p["w"]) == norm(chave) and (not inicios or i > inicios[-1])))
eventos = []
for j, (_, txt) in enumerate(TEXTOS):
    a = inicios[j]
    b = inicios[j + 1] if j + 1 < len(inicios) else len(palavras)
    eventos += blocos(txt, palavras[a:b])


def ass(arq):
    cab = ("[Script Info]\nScriptType: v4.00+\nPlayResX: 1280\nPlayResY: 720\nWrapStyle: 2\n\n[V4+ Styles]\n"
           "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
           "Style: Leg,Segoe UI,24,&H00FFFFFF,&H00FFFFFF,&H30060C14,&H30060C14,-1,0,0,0,100,100,0,0,3,6,0,2,16,16,6,1\n\n[Events]\n"
           "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
    ev = ""
    for e in eventos:
        ini, fim = V(e["ini"]), V(e["fim"]) + 0.05
        na_tela = V(T_CENA2) <= ini < V(T_TROCA)   # com a coluna do Santinho, o texto centra em x=720; nas outras, em 640
        pos = "\\an2\\pos(720,712)" if na_tela else "\\an2\\pos(640,690)"
        ev += f"Dialogue: 0,{ts(ini)},{ts(fim)},Leg,,0,0,0,,{{{pos}}}{e['txt']}\n"
    open(arq, "w", encoding="utf-8").write(cab + ev)


ass("leg.ass")


def srt(arq):
    def f(x):
        ms = round(x * 1000); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
    NL = chr(10)
    blocos_srt = [
        f"{i}{NL}{f(V(e['ini']))} --> {f(V(e['fim']) + 0.05)}{NL}{e['txt'].replace(chr(92) + 'N', NL)}"
        for i, e in enumerate(eventos, 1)
    ]
    open(arq, "w", encoding="utf-8").write((NL + NL).join(blocos_srt) + NL)


srt("legendas.srt")

# ---------- parte A: abertura express + cena 1 ----------
ff("-framerate", "30", "-i", "quadros/%04d.jpg", "-vf", "scale=in_range=full:out_range=tv,format=yuv420p,setsar=1", *VCOD, "-t", f"{V(T_CENA2):.2f}", "p-a.mp4")

# ---------- parte B: a tela gravada ----------
m = json.load(open("rep-marcas.json", encoding="utf-8"))
li, fo = m["login_ini"], m["form_ok"]
dur_login = V(T_CENA3) - V(T_CENA2)          # a cena 2 inteira
dur_form = T_TROCA - T_CENA3                 # da cena 3 até a troca para o fecho (1,0x)
k1 = dur_login / (fo - li)
DB = dur_login + dur_form
ff("-i", "rep-tomada-01.webm", "-loop", "1", "-i", "santinho-200.png", "-filter_complex",
   f"[0:v]split=2[v1][v2];"
   f"[v1]trim=start={li}:end={fo},setpts=(PTS-STARTPTS)*{k1:.4f},fps=30,scale=1088:612,setsar=1[a];"
   f"[v2]trim=start={fo}:end={fo + dur_form:.3f},setpts=PTS-STARTPTS,fps=30,scale=1088:612,setsar=1[b];"
   f"[a][b]concat=n=2:v=1:a=0[t0];[t0]pad=1092:616:2:2:color=0xE3D3BD[t];"
   f"color=c=0xF4EEE3:s=1280x720:r=30:d={DB:.2f}[bg];[bg][t]overlay=x=176:y=10:shortest=1[b1];"
   f"[1:v]scale=165:165,format=rgba[s];[b1][s]overlay=x=6:y='720-165-12+4*sin(2.4*t)':shortest=1,format=yuv420p[v]",
   "-map", "[v]", *VCOD, "-t", f"{DB:.2f}", "p-b.mp4")
print(f"login esticado x{k1:.2f}: {fo - li:.2f} s -> {dur_login:.2f} s; formulário {dur_form:.2f} s em 1,0x")

# ---------- parte C: fecho ----------
DC = D - V(T_TROCA)
ff("-loop", "1", "-i", "santinho-420.png", "-loop", "1", "-i", "logo.png", "-filter_complex",
   f"color=c=0xF4EEE3:s=1280x720:r=30:d={DC:.2f}[bg];[0:v]scale=420:420,format=rgba[s];[1:v]scale=520:-1,format=rgba[lg];"
   f"[bg][lg]overlay=x=690:y=300:shortest=1[c1];[c1][s]overlay=x=190:y='150+6*sin(2.4*t)':shortest=1[c2];"
   f"[c2]fade=t=out:st={DC - 0.5:.2f}:d=0.5,format=yuv420p[v]", "-map", "[v]", *VCOD, "-t", f"{DC:.2f}", "p-c.mp4")

# ---------- final: junta as partes, queima as legendas e mistura o áudio ----------
SOM_ATEMPO = "atempo=1.4286,atempo=1.4286"  # o som de entrada original dura 5,4 s; aqui toca em ~2,65 s, como a animação
ff("-i", "p-a.mp4", "-i", "p-b.mp4", "-i", "p-c.mp4", "-i", "voz.mp3", "-i", "som-abertura.wav", "-filter_complex",
   "[0:v][1:v][2:v]concat=n=3:v=1:a=0[vc];"
   "[vc]subtitles=leg.ass:fontsdir=C\\\\:/Windows/Fonts,format=yuv420p[v];"
   f"[3:a]asetrate=44100*2^(2/12),aresample=48000,atempo=1/2^(2/12),adelay={int(TV * 1000)}:all=1,aformat=sample_rates=48000:channel_layouts=stereo[voz];"
   f"[4:a]atrim=0:5.4,asetpts=PTS-STARTPTS,{SOM_ATEMPO},afade=t=out:st=2.2:d=0.45,volume=0.8,aformat=sample_rates=48000:channel_layouts=stereo[som];"
   f"[voz][som]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95,apad,atrim=0:{D:.2f},loudnorm=I=-16:TP=-1.5:LRA=11[a]",
   "-map", "[v]", "-map", "[a]", *VCOD, *ACOD, "-t", f"{D:.2f}", "-movflags", "+faststart", SAIDA)
print(f"PRONTO: {SAIDA} ({dur(SAIDA):.1f} s)")
