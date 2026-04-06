# PixelLab API v2 — Endpoint Reference

Complete parameter reference for all PixelLab API v2 endpoints wrapped by `pixellab.sh`.

**Base URL:** `https://api.pixellab.ai/v2`
**Auth:** `Authorization: Bearer $PIXELLAB_API_KEY`
**Content-Type:** `application/json`

---

## Async Job Polling

Async endpoints (generate-image-v2, generate-ui-v2, generate-with-style-v2, edit-images-v2, inpaint-v3) return 202 with `background_job_id`.

```bash
curl -s "https://api.pixellab.ai/v2/background-jobs/{JOB_ID}" \
  -H "Authorization: Bearer $PIXELLAB_API_KEY"
```

Response `status`: `"processing"` | `"completed"` | `"failed"`
When completed: images in `.last_response.images[]` (array of `{type, base64, format}`)

---

## 1. animate-with-text-v3 (SYNC)

Animate a static sprite from first frame + action description.

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `first_frame` | Base64Image | YES | — | Max 256x256 |
| `last_frame` | Base64Image | no | null | Guide endpoint pose |
| `action` | string | YES | — | Movement description, 1-500 chars |
| `frame_count` | int | no | 8 | 4-16, must be even |
| `no_background` | bool | no | null | Transparent frames |
| `seed` | int | no | null | >=0 |

**Pixel budget:** width x height x frame_count <= 524,288
**Frame count by size:** 256x256 → max 8 frames, 128x128 → max 16, 64x64 → max 16

---

## 2. generate-ui-v2 (ASYNC)

Generate pixel art UI elements.

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `description` | string | YES | — | 1-2000 chars |
| `image_size` | {width, height} | no | 256x256 | 16-792 x 16-688 |
| `no_background` | bool | no | null | Transparent |
| `concept_image` | {image, size} | no | null | Design guidance ref |
| `color_palette` | string | no | null | e.g. "brown and gold", max 200 chars |
| `seed` | int | no | null | >=0 |

---

## 3. generate-image-v2 (ASYNC)

General text-to-pixel-art. Multiple results based on size.

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `description` | string | YES | — | 1-2000 chars |
| `image_size` | {width, height} | YES | — | 16-792 x 16-688 |
| `no_background` | bool | no | null | Transparent |
| `reference_images` | array | no | null | Max 4 items: {image, size, usage_description?} |
| `style_image` | {image, size} | no | null | Style reference |
| `style_options` | object | no | all true | {color_palette, outline, detail, shading} |
| `seed` | int | no | null | >=0 |

**Result count by max dimension:** <=42px→64, 43-85px→16, 86-170px→4, >170px→1

---

## 4. generate-with-style-v2 (ASYNC)

Generate pixel art matching reference style.

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `style_images` | array | YES | — | 1-4 items: {image, width, height} |
| `description` | string | YES | — | 1-2000 chars |
| `image_size` | {width, height} | YES | — | 16-512 x 16-512 |
| `style_description` | string | no | null | Text style hint, max 500 |
| `no_background` | bool | no | null | Transparent |
| `seed` | int | no | null | >=0 |

---

## 5. edit-images-v2 (ASYNC)

Edit existing pixel art with text or reference.

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `method` | enum | no | "edit_with_text" | "edit_with_text" or "edit_with_reference" |
| `edit_images` | array | YES | — | 1-16 items: {image, width, height} |
| `image_size` | {width, height} | YES | — | 32-512 x 32-512 |
| `description` | string | no | null | Required for edit_with_text |
| `reference_image` | {image, width, height} | no | null | Required for edit_with_reference |
| `no_background` | bool | no | null | Transparent |
| `seed` | int | no | null | >=0 |

**Frame limits:** 32-64px→16, 65-80px→9, 81-128px→4, 129-512px→1

---

## 6. image-to-pixelart (SYNC)

Convert photos/images to pixel art. Output ~1/4 input size recommended.

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `image` | Base64Image | YES | — | Source image |
| `image_size` | {width, height} | YES | — | Input: 16-1280 x 16-1280 |
| `output_size` | {width, height} | YES | — | Output: 16-320 x 16-320 |
| `text_guidance_scale` | float | no | null | 1.0-20.0 |
| `seed` | int | no | null | >=0 |

---

## 7. remove-background (SYNC)

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `image` | Base64Image | YES | — | Source |
| `image_size` | {width, height} | YES | — | 1-400 x 1-400 |
| `background_removal_task` | enum | no | "remove_simple_background" | or "remove_complex_background" |
| `text` | string | no | null | Foreground hint, max 500 |
| `seed` | int | no | null | >=0 |

---

## 8. inpaint-v3 (ASYNC)

Region-based AI editing with mask. White=generate, black=keep.

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `description` | string | YES | — | What to generate |
| `inpainting_image` | {image, size} | YES | — | 32-512px |
| `mask_image` | {image, size} | YES | — | White=generate, black=keep |
| `no_background` | bool | no | null | Remove bg from result |
| `crop_to_mask` | bool | no | null | Crop to mask boundary |
| `seed` | int | no | null | >=0 |

---

## 9. resize (SYNC)

Smart pixel-art resize. Max 2x increase or 50% decrease per call.

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `description` | string | YES | — | What the sprite depicts |
| `reference_image` | Base64Image | YES | — | Source |
| `reference_image_size` | {width, height} | YES | — | 16-200 x 16-200 |
| `target_size` | {width, height} | YES | — | 16-200 x 16-200 |
| `view` | enum | no | null | "side" / "low top-down" / "high top-down" |
| `direction` | enum | no | null | 8 compass directions |
| `no_background` | bool | no | null | Transparent |
| `color_image` | Base64Image | no | null | Palette reference |
| `seed` | int | no | null | >=0 |

---

## 10. rotate (SYNC)

Rotate sprite direction/view.

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `image_size` | {width, height} | YES | — | 16-200 x 16-200 |
| `from_image` | Base64Image | YES | — | Source sprite |
| `image_guidance_scale` | float | no | 3.0 | 1.0-20.0 |
| `from_view` / `to_view` | enum | no | null | "side" / "low top-down" / "high top-down" |
| `from_direction` / `to_direction` | enum | no | null | 8 compass directions |
| `view_change` | int | no | null | -90 to 90 degrees |
| `direction_change` | int | no | null | -180 to 180 degrees |
| `isometric` | bool | no | false | Isometric view |
| `no_background` | bool | no | null | Transparent |
| `color_image` | Base64Image | no | null | Palette reference |
| `seed` | int | no | null | >=0 |

---

## Base64Image Format

```json
{"type": "base64", "base64": "<data>", "format": "png"}
```

Short form: `{"base64": "<data>"}` (type/format default to base64/png)

## Directions

`south` | `south-east` | `east` | `north-east` | `north` | `north-west` | `west` | `south-west`
