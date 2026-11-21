import unittest

from device import select_device


class SelectDeviceTest(unittest.TestCase):
    def test_prefers_mps_when_available(self):
        self.assertEqual(select_device(mps_available=True, cuda_available=True), "mps")

    def test_falls_back_to_cuda_without_mps(self):
        self.assertEqual(select_device(mps_available=False, cuda_available=True), "cuda")

    def test_falls_back_to_cpu_without_gpu(self):
        self.assertEqual(select_device(mps_available=False, cuda_available=False), "cpu")


if __name__ == "__main__":
    unittest.main()
