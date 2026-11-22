import sys
import datetime
import os

# let operations that MPS does not implement yet run on the CPU instead of aborting the run;
# must be set before torch is imported
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

print("Speaker Diarization")

input_file = sys.argv[1]
output_file = sys.argv[2]
hugging_face_token = sys.argv[3]

print("Input file: ", input_file)
print("Output file: ", output_file)

print("Timestamp: ", datetime.datetime.now())

import torch
from pyannote.audio import Pipeline
from pyannote.core import Annotation

def fastest_available_device():
    if torch.backends.mps.is_available():
        return torch.device("mps")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")

# pipelines configured as legacy return the Annotation itself instead of a DiarizeOutput
def speaker_diarization_of(output):
    return output if isinstance(output, Annotation) else output.speaker_diarization

pipeline = Pipeline.from_pretrained(
  "pyannote/speaker-diarization-community-1",
  token=hugging_face_token)

device = fastest_available_device()
print("Device: ", device)
pipeline.to(device)

from pyannote.audio.pipelines.utils.hook import ProgressHook
with ProgressHook() as hook:
    output = pipeline(input_file, hook=hook)

# dump the diarization output to disk using RTTM format
with open(output_file, "w") as rttm:
    speaker_diarization_of(output).write_rttm(rttm)

print("Timestamp: ", datetime.datetime.now())
print("Done.")
