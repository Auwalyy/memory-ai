"""
Download model files from a Hugging Face Storage Bucket into a local folder.

Used to load the N-ATLaS LLM from the project's bucket (e.g. Auwalyyy/N-ATLaS-bucket)
instead of the gated NCAIR1/N-ATLaS repo. Standard library only; resumes by skipping
files that are already complete.

    python bucket.py Auwalyyy/N-ATLaS-bucket ./models/N-ATLaS
"""

import json
import os
import sys
import urllib.request

HF = "https://huggingface.co"
CHUNK = 8 * 1024 * 1024


def _request(url: str):
    headers = {"User-Agent": "memoryai-natlas-gateway"}
    token = os.getenv("HF_TOKEN")
    if token:  # only needed for private buckets
        headers["Authorization"] = f"Bearer {token}"
    return urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=60)


def list_files(bucket: str):
    with _request(f"{HF}/api/buckets/{bucket}/tree") as res:
        return [f for f in json.load(res) if f.get("type") == "file"]


def download_bucket(bucket: str, target_dir: str) -> str:
    """Download every file in `bucket` into `target_dir` and return the directory."""
    os.makedirs(target_dir, exist_ok=True)
    files = list_files(bucket)
    if not any(f["path"] == "config.json" for f in files):
        raise RuntimeError(f"Bucket {bucket} does not contain a model (config.json missing)")

    for f in files:
        path, size = f["path"], f.get("size")
        dest = os.path.join(target_dir, path)
        if os.path.exists(dest) and (size is None or os.path.getsize(dest) == size):
            continue
        os.makedirs(os.path.dirname(dest) or target_dir, exist_ok=True)
        tmp = dest + ".part"
        print(f"[bucket] downloading {path} ({(size or 0) / 1e9:.2f} GB)", flush=True)
        with _request(f"{HF}/buckets/{bucket}/resolve/{path}") as res, open(tmp, "wb") as out:
            while True:
                chunk = res.read(CHUNK)
                if not chunk:
                    break
                out.write(chunk)
        if size is not None and os.path.getsize(tmp) != size:
            os.remove(tmp)
            raise RuntimeError(f"Incomplete download for {path}")
        os.replace(tmp, dest)

    print(f"[bucket] {bucket} ready in {target_dir}", flush=True)
    return target_dir


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: python bucket.py <owner/bucket> <target_dir>")
    download_bucket(sys.argv[1], sys.argv[2])
