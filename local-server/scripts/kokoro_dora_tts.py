#!/usr/bin/env python3
"""
TTS Dora PT-BR offline via kokoro-python.

Uso:
    python kokoro_dora_tts.py --text "Olá" --out /tmp/kaline-dora.wav
    python kokoro_dora_tts.py --text "Olá" --out /tmp/kaline-dora.wav --speed 1.1

Arquivos esperados em <base-dir>:
    config.json
    kokoro-v1_0.pth
    voices/pf_dora.pt

O pacote `kokoro` deve estar instalado no ambiente Python que executar este script.
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path

EXPECTED_SHA256 = "496dba118d1a58f5f3db2efc88dbdc216e0483fc89fe6e47ee1f2c53f18ad1e4"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="TTS Dora PT-BR offline via kokoro-python")
    parser.add_argument("--text", required=True, help="Texto a ser sintetizado.")
    parser.add_argument("--out", required=True, help="Caminho de saída WAV.")
    parser.add_argument("--speed", type=float, default=1.0, help="Velocidade (default: 1.0).")
    parser.add_argument(
        "--base-dir",
        default="~/Kaline/motores/kokoro-python",
        help="Diretório base do modelo (default: ~/Kaline/motores/kokoro-python).",
    )
    args = parser.parse_args()

    base_dir = Path(args.base_dir).expanduser().resolve()
    config_path = base_dir / "config.json"
    model_path = base_dir / "kokoro-v1_0.pth"
    voice_path = base_dir / "voices" / "pf_dora.pt"

    missing = [p for p in (config_path, model_path, voice_path) if not p.exists()]
    if missing:
        fail(
            f"Arquivo(s) não encontrado(s) em {base_dir}: "
            + ", ".join(str(p.name) for p in missing)
        )

    if not config_path.is_file():
        fail(f"config.json não é um arquivo regular: {config_path}")
    if not model_path.is_file():
        fail(f"kokoro-v1_0.pth não é um arquivo regular: {model_path}")
    if not voice_path.is_file():
        fail(f"voices/pf_dora.pt não é um arquivo regular: {voice_path}")

    digest = sha256_file(model_path)
    if digest != EXPECTED_SHA256:
        fail(
            f"SHA256 de kokoro-v1_0.pth não confere.\n"
            f"  esperado: {EXPECTED_SHA256}\n"
            f"  obtido:   {digest}"
        )

    try:
        import soundfile  # noqa: F401
        from kokoro import KPipeline
        from kokoro.model import KModel
    except ImportError as exc:
        fail(f"Pacote Python necessário não instalado: {exc}")

    try:
        model = KModel(config=str(config_path), model=str(model_path)).to("cpu").eval()
    except Exception as exc:
        fail(f"Falha ao carregar modelo kokoro: {exc}")

    try:
        pipeline = KPipeline(
            lang_code="p",
            model=model,
            repo_id="hexgrad/Kokoro-82M",
            device="cpu",
        )
    except Exception as exc:
        fail(f"Falha ao criar KPipeline: {exc}")

    text = args.text
    if not text.strip():
        fail("Texto vazio após trim.")

    speed = args.speed
    if not (0.1 <= speed <= 5.0):
        fail(f"Fora da faixa aceitável (0.1–5.0): {speed}")

    generator = pipeline(text, voice=str(voice_path), speed=speed)

    wav_path = Path(args.out).resolve()
    wav_path.parent.mkdir(parents=True, exist_ok=True)
    if wav_path.exists():
        try:
            wav_path.unlink()
        except OSError as exc:
            fail(f"Falha ao remover saída existente: {exc}")

    sample_rate = 24000
    total_frames = 0
    try:
        for result in generator:
            if hasattr(result, "audio"):
                audio = result.audio
            elif isinstance(result, (tuple, list)):
                audio = result[2] if len(result) > 2 else None
            else:
                audio = None

            if audio is None:
                fail("KPipeline retornou resultado sem áudio.")

            if hasattr(audio, "numpy"):
                data = audio.numpy()
            else:
                data = audio

            soundfile.write(str(wav_path), data, sample_rate)
            total_frames += len(data)
    except Exception:
        if wav_path.exists():
            try:
                wav_path.unlink()
            except OSError:
                pass
        raise

    size_bytes = wav_path.stat().st_size
    duration_seconds = total_frames / sample_rate if sample_rate else 0.0
    print(
        json.dumps(
            {
                "ok": True,
                "provider": "kokoro-python",
                "voice": "pf_dora",
                "lang": "pt-br",
                "sample_rate": sample_rate,
                "samples": total_frames,
                "duration_seconds": round(duration_seconds, 3),
                "size_bytes": size_bytes,
                "out": str(wav_path),
            }
        )
    )
    sys.exit(0)


if __name__ == "__main__":
    main()
