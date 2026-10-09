"""
MemoryAI N-ATLAS gateway.

Serves Nigeria's N-ATLAS models behind a small OpenAI-compatible HTTP API so
the MemoryAI backend (NAtlasService) can call them:

  POST /v1/audio/transcriptions   multipart: file, language   -> {"text", "model", "language"}
  POST /v1/chat/completions       OpenAI chat format          -> OpenAI chat response
  GET  /health

Models:
  ASR  NCAIR1/Hausa-ASR  (Whisper-small fine-tuned for Hausa)
  LLM  NCAIR1/N-ATLaS    (Llama-3 8B fine-tuned for Hausa, Yoruba, Igbo, English)
       loaded from the Hugging Face Storage Bucket in LLM_BUCKET when set
       (e.g. Auwalyyy/N-ATLaS-bucket), otherwise from the gated NCAIR1 repo (needs HF_TOKEN).

Run:  uvicorn server:app --host 0.0.0.0 --port 8080
"""

import os
import threading
import time
import uuid
from typing import List, Optional

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel

API_KEY = os.getenv("NATLAS_GATEWAY_API_KEY", "")
# Name reported to the backend (stored in provenance)
LLM_MODEL_ID = os.getenv("LLM_MODEL", "NCAIR1/N-ATLaS")
# Optional Hugging Face Storage Bucket holding the N-ATLaS weights, downloaded once to LLM_LOCAL_DIR
LLM_BUCKET = os.getenv("LLM_BUCKET", "")
LLM_LOCAL_DIR = os.getenv("LLM_LOCAL_DIR", os.path.join(os.path.dirname(__file__), "models", "N-ATLaS"))
LOAD_LLM = os.getenv("LOAD_LLM", "1") == "1"
# Load the LLM at startup so the first request does not exceed the backend timeout
PRELOAD_LLM = os.getenv("PRELOAD_LLM", "1") == "1"

# language -> ASR model. Override or add with ASR_MODEL_<LANGUAGE>, e.g. ASR_MODEL_YORUBA.
ASR_MODELS = {"hausa": "NCAIR1/Hausa-ASR"}
for key, value in os.environ.items():
    if key.startswith("ASR_MODEL_") and value:
        ASR_MODELS[key[len("ASR_MODEL_"):].lower()] = value

app = FastAPI(title="MemoryAI N-ATLAS Gateway")

_asr_pipelines = {}
_llm = {}
_gpu_lock = threading.Lock()  # one generation at a time on a single GPU/CPU


def require_key(authorization: Optional[str] = Header(default=None)):
    if API_KEY and authorization != f"Bearer {API_KEY}":
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


def _device():
    import torch

    return 0 if torch.cuda.is_available() else -1


def get_asr(language: str):
    model_id = ASR_MODELS.get(language)
    if not model_id:
        raise HTTPException(status_code=400, detail=f"No N-ATLAS ASR model configured for '{language}'")
    if model_id not in _asr_pipelines:
        from transformers import pipeline

        _asr_pipelines[model_id] = pipeline(
            "automatic-speech-recognition",
            model=model_id,
            device=_device(),
            chunk_length_s=30,  # long oral histories
        )
    return model_id, _asr_pipelines[model_id]


def get_llm():
    if not LOAD_LLM:
        raise HTTPException(status_code=503, detail="LLM disabled on this gateway (LOAD_LLM=0)")
    if not _llm:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        source = LLM_MODEL_ID
        if LLM_BUCKET:
            from bucket import download_bucket

            source = download_bucket(LLM_BUCKET, LLM_LOCAL_DIR)

        if torch.cuda.is_available():
            # Weights are stored in bfloat16; fall back to float16 on older GPUs
            dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
        else:
            dtype = torch.float32
        _llm["tokenizer"] = AutoTokenizer.from_pretrained(source)
        _llm["model"] = AutoModelForCausalLM.from_pretrained(source, torch_dtype=dtype, device_map="auto")
    return _llm["tokenizer"], _llm["model"]


@app.on_event("startup")
def preload():
    if LOAD_LLM and PRELOAD_LLM:
        get_llm()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "asr_models": ASR_MODELS,
        "llm_model": LLM_MODEL_ID if LOAD_LLM else None,
        "llm_source": (f"bucket:{LLM_BUCKET}" if LLM_BUCKET else LLM_MODEL_ID) if LOAD_LLM else None,
        "loaded": {"asr": list(_asr_pipelines), "llm": bool(_llm)},
    }


@app.post("/v1/audio/transcriptions", dependencies=[Depends(require_key)])
def transcribe(
    file: UploadFile = File(...),
    language: str = Form("hausa"),
    model: Optional[str] = Form(None),  # accepted for OpenAI compatibility; language selects the model
    response_format: Optional[str] = Form("json"),
):
    audio = file.file.read()
    if not audio:
        raise HTTPException(status_code=400, detail="Empty audio file")
    model_id, asr = get_asr(language.lower())
    started = time.time()
    with _gpu_lock:
        # Raw bytes are decoded with ffmpeg (webm/ogg/mp3/m4a/wav) and resampled to 16 kHz
        result = asr(audio)
    return {
        "text": (result.get("text") or "").strip(),
        "model": model_id,
        "language": language,
        "duration_ms": int((time.time() - started) * 1000),
    }


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model: Optional[str] = None
    messages: List[Message]
    temperature: float = 0.1
    max_tokens: int = 1000
    repetition_penalty: float = 1.12
    top_p: Optional[float] = None


@app.post("/v1/chat/completions", dependencies=[Depends(require_key)])
def chat(req: ChatRequest):
    tokenizer, model = get_llm()
    prompt = tokenizer.apply_chat_template(
        [m.model_dump() for m in req.messages], tokenize=False, add_generation_prompt=True
    )
    # The chat template already contains <|begin_of_text|>; don't add a second BOS
    inputs = tokenizer(prompt, return_tensors="pt", add_special_tokens=False).to(model.device)
    gen_kwargs = {
        "max_new_tokens": min(req.max_tokens, 2048),
        "repetition_penalty": req.repetition_penalty,
        "use_cache": True,
        "pad_token_id": tokenizer.eos_token_id,
    }
    if req.temperature and req.temperature > 0:
        gen_kwargs.update(do_sample=True, temperature=req.temperature, top_p=req.top_p or 0.9)
    else:
        gen_kwargs.update(do_sample=False)

    with _gpu_lock:
        output = model.generate(**inputs, **gen_kwargs)
    new_tokens = output[0][inputs["input_ids"].shape[1]:]
    text = tokenizer.decode(new_tokens, skip_special_tokens=True).strip()

    return {
        "id": f"chatcmpl-{uuid.uuid4().hex}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": LLM_MODEL_ID,
        "choices": [{"index": 0, "message": {"role": "assistant", "content": text}, "finish_reason": "stop"}],
        "usage": {
            "prompt_tokens": int(inputs["input_ids"].shape[1]),
            "completion_tokens": int(len(new_tokens)),
            "total_tokens": int(inputs["input_ids"].shape[1] + len(new_tokens)),
        },
    }
