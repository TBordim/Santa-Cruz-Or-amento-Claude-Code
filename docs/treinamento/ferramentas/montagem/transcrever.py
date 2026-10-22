import sys, json
from faster_whisper import WhisperModel
arq, saida, modelo = sys.argv[1], sys.argv[2], sys.argv[3]
m = WhisperModel(modelo, device="cpu", compute_type="int8", download_root=sys.argv[4])
segs, info = m.transcribe(arq, language="pt", word_timestamps=True, vad_filter=False, beam_size=5)
palavras = []
for s in segs:
    for w in s.words:
        palavras.append({"w": w.word.strip(), "ini": round(w.start, 2), "fim": round(w.end, 2)})
json.dump(palavras, open(saida, "w", encoding="utf-8"), ensure_ascii=False)
print(len(palavras), "palavras")
print(" ".join(p["w"] for p in palavras))
