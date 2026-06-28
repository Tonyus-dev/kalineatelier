#!/usr/bin/env python3
"""
Persistent TTS worker for kokoro-python (Dora PT-BR offline).

Loads the Kokoro model once on startup, then reads JSON-RPC requests
from stdin and writes JSON responses + WAV bytes to stdout.

Protocol (one request per invocation via stdin line):
    {"id":1,"method":"synthesize","text":"Olá","speed":1.0}

Response (two lines on stdout):
    1. JSON header:  {"id":1,"ok":true,"size_bytes":12345,"duration_seconds":1.5,"sample_rate":24000}
    2. WAV binary:   <raw bytes of exactly size_bytes>

Error response (one line on stdout):
    {"id":1,"ok":false,"error":"message"}

Shutdown:
    {"id":0,"method":"shutdown"}
    or SIGTERM / SIGINT
"""

import hashlib
import json
import signal
import sys
from pathlib import Path

EXPECTED_SHA256 = "496dba118d1a58f5f3db2efc88dbdc216e0483fc89fe6e47ee1f2c53f18ad1e4"

# Global model state — loaded once
_model = None
_pipeline = None
_base_dir = None
_sample_rate = 24000


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def load_model(base_dir: str):
    """Load KModel + KPipeline once. Sets globals _model, _pipeline, _base_dir."""
    global _model, _pipeline, _base_dir

    _base_dir = Path(base_dir).expanduser().resolve()
    config_path = _base_dir / "config.json"
    model_path = _base_dir / "kokoro-v1_0.pth"
    voice_path = _base_dir / "voices" / "pf_dora.pt"

    missing = [p for p in (config_path, model_path, voice_path) if not p.exists()]
    if missing:
        raise FileNotFoundError(
            f"Arquivo(s) não encontrado(s) em {_base_dir}: "
            + ", ".join(str(p.name) for p in missing)
        )

    digest = sha256_file(model_path)
    if digest != EXPECTED_SHA256:
        raise ValueError(
            f"SHA256 de kokoro-v1_0.pth não confere.\n"
            f"  esperado: {EXPECTED_SHA256}\n"
            f"  obtido:   {digest}"
        )

    try:
        import soundfile  # noqa: F401
        from kokoro import KPipeline
        from kokoro.model import KModel
    except ImportError as exc:
        raise ImportError(f"Pacote Python necessário não instalado: {exc}") from exc

    try:
        _model = KModel(config=str(config_path), model=str(model_path)).to("cpu").eval()
    except Exception as exc:
        raise RuntimeError(f"Falha ao carregar modelo kokoro: {exc}") from exc

    try:
        _pipeline = KPipeline(
            lang_code="p",
            model=_model,
            repo_id="hexgrad/Kokoro-82M",
            device="cpu",
        )
    except Exception as exc:
        raise RuntimeError(f"Falha ao criar KPipeline: {exc}") from exc


def synthesize(text: str, speed: float = 1.0) -> bytes:
    """Synthesize text to WAV bytes using the pre-loaded model."""
    if _pipeline is None:
        raise RuntimeError("Modelo não carregado. Chame load_model() primeiro.")

    voice_path = _base_dir / "voices" / "pf_dora.pt"
    generator = _pipeline(text, voice=str(voice_path), speed=speed)

    import numpy as np
    import soundfile

    chunks = []
    total_frames = 0
    for result in generator:
        if hasattr(result, "audio"):
            audio = result.audio
        elif isinstance(result, (tuple, list)):
            audio = result[2] if len(result) > 2 else None
        else:
            audio = None

        if audio is None:
            raise RuntimeError("KPipeline retornou resultado sem áudio.")

        if hasattr(audio, "numpy"):
            data = audio.numpy()
        else:
            data = audio
        chunks.append(data)
        total_frames += len(data)

    if not chunks:
        raise RuntimeError("KPipeline não produziu áudio.")

    # Concatenate all chunks and write to WAV in memory
    full_audio = np.concatenate(chunks) if len(chunks) > 1 else chunks[0]

    # Write WAV to a bytes buffer
    import io

    buf = io.BytesIO()
    soundfile.write(buf, full_audio, _sample_rate, format="WAV")
    return buf.getvalue()


def send_response(resp: dict) -> None:
    """Write a JSON response line to stdout, flush immediately."""
    sys.stdout.write(json.dumps(resp, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def send_response_with_wav(resp: dict, wav_bytes: bytes) -> None:
    """Write JSON header line followed by raw WAV bytes, then flush."""
    sys.stdout.write(json.dumps(resp, ensure_ascii=False) + "\n")
    sys.stdout.flush()
    sys.stdout.buffer.write(wav_bytes)
    sys.stdout.buffer.flush()


def main() -> None:
    # Read base-dir from command line argument
    base_dir = None
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--base-dir" and i + 1 < len(args):
            base_dir = args[i + 1]
            i += 2
        else:
            i += 1

    if not base_dir:
        send_response({"id": 0, "ok": False, "error": "--base-dir é obrigatório."})
        sys.exit(1)

    # Load model on startup
    try:
        load_model(base_dir)
    except Exception as exc:
        send_response({"id": 0, "ok": False, "error": f"Falha ao carregar modelo: {exc}"})
        sys.exit(1)

    send_response({"id": 0, "ok": True, "message": "Worker pronto."})

    # Handle graceful shutdown
    shutting_down = False

    def _signal_handler(signum, frame):
        nonlocal shutting_down
        shutting_down = True
        send_response({"id": 0, "ok": True, "message": "Worker encerrando."})
        sys.exit(0)

    signal.signal(signal.SIGTERM, _signal_handler)
    signal.signal(signal.SIGINT, _signal_handler)

    # Main request loop — read JSON lines from stdin
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            req = json.loads(line)
        except json.JSONDecodeError as exc:
            send_response({"id": 0, "ok": False, "error": f"JSON inválido: {exc}"})
            continue

        req_id = req.get("id", 0)
        method = req.get("method", "")

        if method == "shutdown":
            send_response({"id": req_id, "ok": True, "message": "Worker encerrando."})
            break

        if method == "synthesize":
            text = (req.get("text") or "").strip()
            if not text:
                send_response({"id": req_id, "ok": False, "error": "Texto vazio."})
                continue

            speed = float(req.get("speed", 1.0))
            if not (0.1 <= speed <= 5.0):
                send_response({"id": req_id, "ok": False, "error": f"Speed fora da faixa (0.1–5.0): {speed}"})
                continue

            try:
                wav_bytes = synthesize(text, speed)
                duration = len(wav_bytes) / _sample_rate  # rough estimate
                send_response_with_wav(
                    {
                        "id": req_id,
                        "ok": True,
                        "provider": "kokoro-python",
                        "voice": "pf_dora",
                        "lang": "pt-br",
                        "sample_rate": _sample_rate,
                        "size_bytes": len(wav_bytes),
                    },
                    wav_bytes,
                )
            except Exception as exc:
                send_response({"id": req_id, "ok": False, "error": str(exc)})
        else:
            send_response({"id": req_id, "ok": False, "error": f"Método desconhecido: {method}"})


if __name__ == "__main__":
    main()