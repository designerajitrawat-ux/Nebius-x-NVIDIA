# FiveUsers API, Hugging Face Spaces (Docker SDK), port 7860.
# Base image ships Chromium + its system deps for exactly this Playwright version.
FROM mcr.microsoft.com/playwright/python:v1.64.0-noble

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HOST=0.0.0.0 \
    PORT=7860 \
    DATA_DIR=/data \
    SAMPLES_DIR=/app/samples \
    CHROMIUM_ARGS="--no-sandbox --disable-dev-shm-usage" \
    HOME=/tmp

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app ./app
COPY samples ./samples

# Spaces run the container as uid 1000; /data is the persistent disk when enabled.
RUN mkdir -p /data && chown -R 1000:1000 /data /app
USER 1000

EXPOSE 7860
HEALTHCHECK --interval=60s --timeout=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:7860/health', timeout=4)"
CMD ["python", "-m", "app"]
