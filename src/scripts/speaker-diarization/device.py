def select_device(mps_available: bool, cuda_available: bool) -> str:
    if mps_available:
        return "mps"
    if cuda_available:
        return "cuda"
    return "cpu"
