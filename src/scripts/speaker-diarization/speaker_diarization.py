import datetime
import sys
import time

import torch
from pyannote.audio import Pipeline
from pyannote.audio.pipelines.utils.hook import ProgressHook

from device import select_device


def detect_fastest_device() -> torch.device:
    return torch.device(
        select_device(
            mps_available=torch.backends.mps.is_available(),
            cuda_available=torch.cuda.is_available(),
        )
    )


def main():
    print("Speaker Diarization")

    input_file = sys.argv[1]
    output_file = sys.argv[2]
    hugging_face_token = sys.argv[3]

    print("Input file: ", input_file)
    print("Output file: ", output_file)

    device = detect_fastest_device()
    print(f"Device: {device}")

    print("Timestamp: ", datetime.datetime.now())

    pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1", use_auth_token=hugging_face_token)
    if pipeline is None:
        sys.exit("Could not load the pyannote pipeline. Check the HuggingFace token and its access to the gated models.")
    pipeline.to(device)

    diarization_start = time.monotonic()
    with ProgressHook() as hook:
        diarization = pipeline(input_file, hook=hook)
    print(f"Diarization took: {time.monotonic() - diarization_start:.0f} s")

    with open(output_file, "w") as rttm:
        diarization.write_rttm(rttm)

    print("Timestamp: ", datetime.datetime.now())
    print("Done.")


if __name__ == "__main__":
    main()
