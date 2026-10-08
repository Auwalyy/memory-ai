# N-ATLAS gateway

N-ATLAS has no public hosted API, so MemoryAI runs the models itself. This small
FastAPI service loads them from Hugging Face and exposes the OpenAI-style
endpoints that the backend's `NAtlasService` calls.

| Endpoint | Model | Used for |
| --- | --- | --- |
| `POST /v1/audio/transcriptions` | `NCAIR1/Hausa-ASR` (Whisper-small) | Hausa speech → transcript |
| `POST /v1/chat/completions` | `NCAIR1/N-ATLaS` (Llama-3 8B) | translation, structuring, source-grounded answers |
| `GET /health` | — | which models are configured/loaded |

## Run

Both models are gated on Hugging Face: accept the licence on each model page, then create an access token.

```bash
cd natlas-gateway
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# ffmpeg must be on PATH (decodes browser webm/ogg recordings)

export HF_TOKEN=hf_xxx
export NATLAS_GATEWAY_API_KEY=some-long-random-string   # optional but recommended
uvicorn server:app --host 0.0.0.0 --port 8080
```

Hardware: the ASR model runs on CPU. The 8B LLM needs a GPU with ~16 GB VRAM in
fp16 (it will run on CPU, slowly). To run ASR here and the LLM elsewhere, set
`LOAD_LLM=0` and point `NATLAS_LLM_ENDPOINT` at another server.

Then in `backend/.env`:

```
NATLAS_ASR_ENDPOINT=http://localhost:8080/v1/audio/transcriptions
NATLAS_LLM_ENDPOINT=http://localhost:8080/v1/chat/completions
NATLAS_API_KEY=some-long-random-string
NATLAS_MODEL=NCAIR1/N-ATLaS
```

## Other ways to host the LLM

Any server with an OpenAI-compatible `/v1/chat/completions` works for the LLM, e.g. vLLM:

```bash
vllm serve NCAIR1/N-ATLaS --max-model-len 8192
# NATLAS_LLM_ENDPOINT=http://<host>:8000/v1/chat/completions
```

For ASR on a Hugging Face Inference Endpoint (raw audio body), set
`NATLAS_ASR_FORMAT=raw` and `NATLAS_ASR_ENDPOINT` to the endpoint URL.

## Adding Yoruba and Igbo

Set `ASR_MODEL_YORUBA=<model id>` / `ASR_MODEL_IGBO=<model id>` here. The
backend already sends the contribution language with every request, and can
also route a language to a separate server with `NATLAS_ASR_ENDPOINT_YORUBA`, etc.
