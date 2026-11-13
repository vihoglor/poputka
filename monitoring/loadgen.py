"""Generate sustained HTTP traffic for the Poputka monitoring demo."""

import os
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

TARGET_URL = os.getenv("TARGET_URL", "http://webapp:8000/api/trips")
DURATION_SECONDS = max(5, int(os.getenv("DURATION_SECONDS", "120")))
CONCURRENCY = max(1, int(os.getenv("CONCURRENCY", "25")))


def worker(deadline: float):
    count = 0
    failed = 0
    total_response_time = 0.0
    while time.monotonic() < deadline:
        started = time.perf_counter()
        request = Request(TARGET_URL, headers={"User-Agent": "Poputka-Monitoring-LoadTest/1.0"})
        try:
            with urlopen(request, timeout=15) as response:
                response.read()
                if 200 <= response.status < 300:
                    count += 1
                else:
                    failed += 1
        except (HTTPError, URLError, TimeoutError, OSError):
            failed += 1
        total_response_time += time.perf_counter() - started

    return count, failed, total_response_time


def main():
    deadline = time.monotonic() + DURATION_SECONDS
    started = time.perf_counter()
    print(f"Target: {TARGET_URL}")
    print(f"Duration: {DURATION_SECONDS} s; concurrency: {CONCURRENCY}")
    print("Generating requests. Watch the Poputka dashboard in Grafana...")

    with ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
        results = list(executor.map(worker, [deadline] * CONCURRENCY))

    elapsed = time.perf_counter() - started
    successful = sum(item[0] for item in results)
    failed = sum(item[1] for item in results)
    response_time = sum(item[2] for item in results)
    total = successful + failed
    average = response_time / total if total else 0

    print("\nLoad test finished")
    print(f"Successful requests: {successful}")
    print(f"Failed requests: {failed}")
    print(f"Elapsed time: {elapsed:.1f} s")
    print(f"Average response time: {average * 1000:.1f} ms")
    print(f"Throughput: {total / elapsed:.1f} requests/s" if elapsed else "Throughput: n/a")


if __name__ == "__main__":
    main()
