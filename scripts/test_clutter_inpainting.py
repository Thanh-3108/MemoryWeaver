import unittest
import numpy as np
from PIL import Image
from extract_textures import find_cleanest_patch, inpaint_clutter_and_foreign_objects, make_seamless_tile, extract_textures


class ClutterInpaintingTest(unittest.TestCase):
    def test_clutter_avoidance_and_inpainting(self):
        # Create synthetic image with a cluttered table (pens, books) and clean wood area
        h, w = 400, 400
        img = np.zeros((h, w, 3), dtype=np.uint8)
        img[:, :] = [139, 90, 43] # Wood background

        # Add heavy clutter in upper half
        import cv2
        cv2.rectangle(img, (20, 20), (350, 180), (230, 230, 240), -1) # White notebook
        cv2.line(img, (30, 80), (280, 110), (10, 10, 10), 6) # Black pen
        cv2.line(img, (50, 140), (290, 130), (200, 20, 20), 5) # Red pen

        # Scan candidate zone [0, 0, 400, 400]
        clean_patch = find_cleanest_patch(img, [0, 0, 400, 400], min_patch_size=64, max_patch_size=150)
        self.assertIsNotNone(clean_patch)

        # Inpaint minor clutter
        inpainted = inpaint_clutter_and_foreign_objects(clean_patch)
        self.assertEqual(inpainted.shape, clean_patch.shape)

        # Seamless tile
        tile = make_seamless_tile(inpainted, target_size=(256, 256))
        self.assertEqual(tile.shape, (256, 256, 3))

    def test_full_pipeline_on_image(self):
        # Create a small valid PIL image
        img = Image.new('RGB', (300, 300), color=(120, 80, 50))
        result = extract_textures(img)
        self.assertEqual(result['status'], 'success')
        self.assertIn('desk', result['textures'])
        self.assertTrue(result['textures']['desk'].startswith('data:image/jpeg;base64,'))
        self.assertIn('desk', result['pbr_materials'])


if __name__ == '__main__':
    unittest.main()
