
import sys
import datetime
import os

print("Speaker Diarization")

input_file = sys.argv[1]
output_file = sys.argv[2]
hugging_face_token = sys.argv[3]

print("Input file: ", input_file)
print("Output file: ", output_file)

print("Timestamp: ", datetime.datetime.now())

# instantiate the pipeline
from pyannote.audio import Pipeline
from pyannote.core import Annotation

# pipelines configured as legacy return the Annotation itself instead of a DiarizeOutput
def speaker_diarization_of(output):
    return output if isinstance(output, Annotation) else output.speaker_diarization

pipeline = Pipeline.from_pretrained(
  "pyannote/speaker-diarization-community-1",
  token=hugging_face_token)

from pyannote.audio.pipelines.utils.hook import ProgressHook
with ProgressHook() as hook:
    output = pipeline(input_file, hook=hook)

# dump the diarization output to disk using RTTM format
with open(output_file, "w") as rttm:
    speaker_diarization_of(output).write_rttm(rttm)

print("Timestamp: ", datetime.datetime.now())
print("Done.")
