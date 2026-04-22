FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# numpy, scipy, pandas, arch, httpx all ship prebuilt manylinux wheels, so
# no compiler / BLAS system packages are needed.
COPY pyproject.toml ./
COPY app/ ./app/

RUN pip install --upgrade pip && pip install .

COPY start.sh /start.sh
RUN chmod +x /start.sh

ENV PORT=8000
EXPOSE 8000

CMD ["/start.sh"]
