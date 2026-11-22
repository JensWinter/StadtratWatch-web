import sys

from pyannote.database.util import load_rttm
from pyannote.metrics.diarization import DiarizationErrorRate

COLLAR_SECONDS = 0.5

def single_annotation_of(rttm_file):
    annotations = list(load_rttm(rttm_file).values())
    if len(annotations) != 1:
        sys.exit(f"Expected exactly one recording in {rttm_file}, found {len(annotations)}")
    return annotations[0]

reference_file = sys.argv[1]
hypothesis_file = sys.argv[2]

metric = DiarizationErrorRate(collar=COLLAR_SECONDS)
components = metric(
  single_annotation_of(reference_file),
  single_annotation_of(hypothesis_file),
  detailed=True)

print("Reference: ", reference_file)
print("Hypothesis: ", hypothesis_file)
print(f"Diarization error rate (collar {COLLAR_SECONDS}s): {components['diarization error rate']:.2%}")
print(f"  missed detection: {components['missed detection']:.1f}s")
print(f"  false alarm:      {components['false alarm']:.1f}s")
print(f"  confusion:        {components['confusion']:.1f}s")
print(f"  of total:         {components['total']:.1f}s")
