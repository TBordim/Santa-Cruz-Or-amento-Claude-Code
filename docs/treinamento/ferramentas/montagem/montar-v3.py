# Monta a v3 do vídeo do Laboratório (01/10/2026) a partir da v2: refaz só as cenas 3, 4 e 6 (telas e voz novas)
# e reaproveita da v2 as cenas 1-2, 5 e 7-15, que não mudaram.
#
#   python montar-v3.py <ffmpeg> <pasta-v2> <pasta-audios-novos> <pasta-tomadas-novas> <pasta-de-trabalho> <saida.mp4>
#
# <pasta-v2>: tem VIDEO-Laboratorio-completo-v2.mp4, cena-06.mp3 (voz antiga da cena 6, já com +2 semitons)
# <pasta-audios-novos>: cena-03.mp3, cena-04.mp3, cena-06-trecho-novo.mp3 (já com +2 semitons) e os arquivos
#   novo.json (tempo de cada palavra do áudio combinado) e velha06.json (idem, da voz antiga da cena 6),
#   gerados por transcrever.py. <pasta-de-trabalho>: precisa de santinho-200.png (imagens-fixas.mjs).
import json, os, re, subprocess, sys, textwrap, unicodedata, difflib, math

FF, V2, NOVOS, TOM, W, SAIDA = sys.argv[1:7]
OFF, CAUDA = 0.3, 0.8
VCOD = ["-c:v", "libx264", "-profile:v", "high", "-level", "4.0", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30",
        "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2"]
os.chdir(W)

# Onde cada cena começa na v2 (soma das durações dos segmentos: voz + cauda; ver montar-completo.py).
C3_INI, C5_INI, C6_INI, C7_INI = 47.18, 79.76, 104.59, 132.17


def dur(a):
    o = subprocess.run([FF, "-hide_banner", "-i", a], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    h, m, s = re.search(r"Duration: (\d+):(\d+):([\d.]+)", o).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


def ff(*a):
    r = subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", *a], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode:
        raise SystemExit(r.stderr[-2500:])


def lufs(arq, ini=None, fim=None):
    args = ["-hide_banner", "-nostats"]
    if ini is not None:
        args += ["-ss", f"{ini}", "-to", f"{fim}"]
    r = subprocess.run([FF, *args, "-i", arq, "-af", "ebur128=peak=none", "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)[-1])


def ts(x):
    return f"{int(x // 3600)}:{int(x % 3600 // 60):02d}:{x % 60:05.2f}"


# ---------- legendas: frases do texto + tempo das palavras da transcrição ----------
def norm(p):
    p = unicodedata.normalize("NFD", p.lower())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in p if unicodedata.category(c) != "Mn"))


def duas_linhas(txt):
    if len(txt) <= 42:
        return txt
    ps = txt.split()
    melhor = min(range(1, len(ps)), key=lambda i: abs(len(" ".join(ps[:i])) - len(" ".join(ps[i:]))))
    return " ".join(ps[:melhor]) + "\n" + " ".join(ps[melhor:])


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


def frases_legenda(texto, mx=84):
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
    """palavras: [{w, ini, fim}] da transcrição, com tempo relativo ao começo do trecho de voz."""
    pecas = frases_legenda(texto)
    meus = [(i, norm(w)) for i, p in enumerate(pecas) for w in p.split()]
    nw = [norm(p["w"]) for p in palavras]
    sm = difflib.SequenceMatcher(None, [m[1] for m in meus], nw, autojunk=False)
    mapa = {}
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            mapa[a + k] = b + k
    # palavras sem par ganham o vizinho mais próximo
    idx = sorted(mapa)
    def tempo(k, fim):
        if k in mapa:
            p = palavras[mapa[k]]
            return p["fim"] if fim else p["ini"]
        ant = max((j for j in idx if j < k), default=None)
        prox = min((j for j in idx if j > k), default=None)
        if ant is None and prox is None:
            return 0.0
        if ant is None:
            return palavras[mapa[prox]]["ini"]
        if prox is None:
            return palavras[mapa[ant]]["fim"]
        a, b = palavras[mapa[ant]]["fim"], palavras[mapa[prox]]["ini"]
        return a + (b - a) * (k - ant) / (prox - ant)
    out, pos = [], 0
    for p in pecas:
        n = len(p.split())
        out.append({"ini": tempo(pos, False), "fim": tempo(pos + n - 1, True), "txt": duas_linhas(p).replace("\n", "\\N")})
        pos += n
    for i in range(len(out) - 1):  # sem sobreposição
        out[i]["fim"] = min(out[i]["fim"], out[i + 1]["ini"] - 0.03)
    return out


def ass(bl, arq):
    cab = ("[Script Info]\nScriptType: v4.00+\nPlayResX: 1280\nPlayResY: 720\nWrapStyle: 2\n\n[V4+ Styles]\n"
           "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
           "Style: Leg,Segoe UI,24,&H00FFFFFF,&H00FFFFFF,&H30060C14,&H30060C14,-1,0,0,0,100,100,0,0,3,6,0,2,176,16,6,1\n\n[Events]\n"
           "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
    ev = "".join(f"Dialogue: 0,{ts(OFF + b['ini'])},{ts(OFF + b['fim'])},Leg,,0,0,0,,{{\\an2\\pos(720,712)}}{b['txt']}\n" for b in bl)
    open(arq, "w", encoding="utf-8").write(cab + ev)


def seg_tela(n, voz, tomada, bl, ganho_db):
    D = dur(voz) + CAUDA
    fator = (dur(tomada) - 1.0) / D
    ass(bl, f"c{n}.ass")
    ff("-ss", "1.0", "-i", tomada, "-loop", "1", "-i", "santinho-200.png", "-i", voz,
       "-filter_complex",
       f"color=c=0xF4EEE3:s=1280x720:r=30:d={D:.2f}[bg];"
       f"[0:v]setpts=(PTS-STARTPTS)/{fator:.4f},fps=30,scale=1088:612,setsar=1[t0];[t0]pad=1092:616:2:2:color=0xE3D3BD[t];"
       f"[bg][t]overlay=x=176:y=10:shortest=1[b1];[1:v]scale=165:165,format=rgba[s];"
       f"[b1][s]overlay=x=6:y='720-165-12+4*sin(2.4*t)':shortest=1[o];"
       f"[o]subtitles=c{n}.ass:fontsdir=C\\\\:/Windows/Fonts,format=yuv420p[v];"
       f"[2:a]adelay={int(OFF * 1000)}:all=1,volume={ganho_db:.2f}dB,aformat=sample_rates=48000:channel_layouts=stereo,apad,atrim=0:{D:.2f}[a]",
       "-map", "[v]", "-map", "[a]", *VCOD, "-t", f"{D:.2f}", f"c-{n}.mp4")
    print(f"cena {n}: {D:.1f} s (tela {fator:.2f}x, ganho {ganho_db:+.1f} dB)")
    return f"c-{n}.mp4"


def fatia(ini, fim, nome):
    v2 = os.path.join(V2, "VIDEO-Laboratorio-completo-v2.mp4")
    ff("-i", v2, "-ss", f"{ini:.3f}", "-t", f"{fim - ini:.3f}", "-vf", "fps=30,scale=1280:720,setsar=1,format=yuv420p", *VCOD, nome)
    return nome


# ---------- palavras e vozes ----------
novo = json.load(open(os.path.join(NOVOS, "novo.json"), encoding="utf-8"))
velha = json.load(open(os.path.join(NOVOS, "velha06.json"), encoding="utf-8"))
CORTE_3_4, CORTE_4_6 = 24.8, 53.28   # pontos de corte do áudio combinado (em segundos)


def rel(lista, ini, fim):
    return [{"w": p["w"], "ini": p["ini"] - ini, "fim": p["fim"] - ini} for p in lista if ini <= p["ini"] < fim]


T3 = "Depois de entrar com seu nome e seu PIN, o aplicativo mostra a página de entrada, com um cartão para cada módulo. Clique em Laboratório. Os módulos que o seu perfil não abre aparecem com um cadeado. Já dentro, você troca de módulo pelo campo Módulo, no topo do menu. No Início, você tem dois atalhos: Cor e Produção."
T4 = "Em Cor fica a lista de todas as cores, em forma de tabela. Ela vai do código mais novo para o mais antigo: como a pilha de provas na mesa, a mais recente fica por cima. Cada linha mostra o código, o cliente e a referência, o LAB alvo, o LAB aprovado, o ΔE e o status. Para achar uma cor, use a busca, que vale para código, cliente ou referência, e o filtro de status ao lado."
T6_A = "Pronto: essa é a bancada da cor, com tudo sobre ela numa tela só."
T6_NOVO = "Antes de preencher, olhe o quadro Como começar. O aplicativo pode sugerir um ponto de partida: uma cor aprovada com LAB parecido, ou o Pantone mais próximo, já convertido em tintas. Se servir, clique em Usar esta fórmula. Se não, comece do zero. Aqui, vamos com a fórmula do fornecedor."
T6_B = "Vamos registrar a primeira fórmula. Escolha a origem, aqui Fórmula do fornecedor, e adicione as tintas com o percentual de cada uma. A soma precisa fechar em 100% exatos. Enquanto não fecha, aparece um alerta ao lado do total. Clique em Salvar rodada."

# cena 6: voz antiga (parte A: "Pronto..."; parte B: "Vamos registrar...") com o trecho novo no meio
i_vamos = next(i for i, p in enumerate(velha) if norm(p["w"]) == "vamos")
corte_a = (velha[i_vamos - 1]["fim"] + velha[i_vamos]["ini"]) / 2
vel_a, vel_b = rel(velha, 0, velha[i_vamos]["ini"]), rel(velha, velha[i_vamos]["ini"], 999)
velha06 = os.path.join(V2, "cena-06.mp3")
trecho = os.path.join(NOVOS, "cena-06-trecho-novo.mp3")
SIL1, SIL2 = 0.20, 0.30
ff("-i", velha06, "-i", trecho, "-filter_complex",
   f"[0:a]atrim=0:{corte_a:.3f},asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=mono[a];"
   f"[0:a]atrim={corte_a:.3f},asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=mono[b];"
   f"[1:a]aformat=sample_rates=44100:channel_layouts=mono[n];"
   f"aevalsrc=0:d={SIL1}:s=44100[s1];aevalsrc=0:d={SIL2}:s=44100[s2];"
   f"[a][s1][n][s2][b]concat=n=5:v=0:a=1[o]", "-map", "[o]", "-c:a", "libmp3lame", "-q:a", "2", "cena-06-v3.mp3")
len_a = corte_a
len_n = dur(trecho)
t0_novo = len_a + SIL1
t0_b = len_a + SIL1 + len_n + SIL2
# A parte B começa em corte_a na voz antiga e em t0_b na nova; o "Vamos" fica (ini_vamos - corte_a) depois do começo de B.
bl6 = (blocos(T6_A, rel(velha, 0, velha[i_vamos]["ini"]))
       + [dict(b, ini=b["ini"] + t0_novo, fim=b["fim"] + t0_novo) for b in blocos(T6_NOVO, rel(novo, CORTE_4_6, 999))]
       + [dict(b, ini=b["ini"] + t0_b + (velha[i_vamos]["ini"] - corte_a), fim=b["fim"] + t0_b + (velha[i_vamos]["ini"] - corte_a)) for b in blocos(T6_B, rel(velha, velha[i_vamos]["ini"], 999))])
bl6.sort(key=lambda b: b["ini"])
for i in range(len(bl6) - 1):
    bl6[i]["fim"] = min(bl6[i]["fim"], bl6[i + 1]["ini"] - 0.03)

# ---------- volume: iguala o nível das vozes novas ao da v2 ----------
ref = lufs(os.path.join(V2, "VIDEO-Laboratorio-completo-v2.mp4"), C5_INI, C6_INI)
print(f"nível da v2 (cena 5): {ref:.1f} LUFS")


def ganho(arq):
    return ref - lufs(arq)


c3 = seg_tela("03", os.path.join(NOVOS, "cena-03.mp3"), os.path.join(TOM, "lab-tomada-01.webm"),
              blocos(T3, rel(novo, 0, CORTE_3_4)), ganho(os.path.join(NOVOS, "cena-03.mp3")))
c4 = seg_tela("04", os.path.join(NOVOS, "cena-04.mp3"), os.path.join(TOM, "lab-tomada-02.webm"),
              blocos(T4, rel(novo, CORTE_3_4, CORTE_4_6)), ganho(os.path.join(NOVOS, "cena-04.mp3")))
c6 = seg_tela("06", "cena-06-v3.mp3", os.path.join(TOM, "lab-tomada-04.webm"), bl6, ganho("cena-06-v3.mp3"))

partes = [fatia(0, C3_INI, "p-a.mp4"), c3, c4, fatia(C5_INI, C6_INI, "p-5.mp4"), c6, fatia(C7_INI, dur(os.path.join(V2, "VIDEO-Laboratorio-completo-v2.mp4")), "p-7.mp4")]
ent, fc = [], ""
for i, s in enumerate(partes):
    ent += ["-i", s]
    fc += f"[{i}:v]fps=30,scale=1280:720,setsar=1,format=yuv420p[v{i}];[{i}:a]aformat=sample_rates=48000:channel_layouts=stereo[a{i}];"
fc += "".join(f"[v{i}][a{i}]" for i in range(len(partes))) + f"concat=n={len(partes)}:v=1:a=1[v][a]"
ff(*ent, "-filter_complex", fc, "-map", "[v]", "-map", "[a]", *VCOD, "-movflags", "+faststart", SAIDA)
print(f"PRONTO: {SAIDA} ({dur(SAIDA):.1f} s)")
