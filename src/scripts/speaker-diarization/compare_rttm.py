import sys

from pyannote.database.util import load_rttm
from pyannote.metrics.diarization import DiarizationErrorRate

# Ignores timing differences of up to 0.25 s around each segment boundary.
COLLAR_SECONDS = 0.5


def load_single_annotation(rttm_file):
    annotations = load_rttm(rttm_file)
    if len(annotations) != 1:
        sys.exit(f"Expected exactly one recording in {rttm_file}, found {len(annotations)}")
    return next(iter(annotations.values()))


def main():
    reference_file = sys.argv[1]
    hypothesis_file = sys.argv[2]

    reference = load_single_annotation(reference_file)
    hypothesis = load_single_annotation(hypothesis_file)

    metric = DiarizationErrorRate(collar=COLLAR_SECONDS)
    components = metric(reference, hypothesis, detailed=True)
    reference_speech_seconds = components["total"]

    print("Reference:   ", reference_file, f"({len(reference.labels())} speakers)")
    print("Hypothesis:  ", hypothesis_file, f"({len(hypothesis.labels())} speakers)")
    print(f"DER:          {components['diarization error rate']:.2%}")
    print(f"Confusion:    {components['confusion'] / reference_speech_seconds:.2%}")
    print(f"Missed:       {components['missed detection'] / reference_speech_seconds:.2%}")
    print(f"False alarm:  {components['false alarm'] / reference_speech_seconds:.2%}")


if __name__ == "__main__":
    main()
