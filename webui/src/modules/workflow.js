function clampToStep(value, step, minValue) {
  if (!Number.isFinite(value)) return minValue
  return Math.max(minValue, Math.round(value / step) * step)
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function clampDimension(value, minValue, fallback) {
  const parsed = Math.round(Number(value))
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(minValue, parsed)
}

function scaledSizePreservingAspect(width, height, maxSide, step = 64, min = 256) {
  const safeW = Math.max(1, Number(width) || 1)
  const safeH = Math.max(1, Number(height) || 1)
  const safeMax = clampToStep(Number(maxSide) || 800, step, min)

  let scaledW
  let scaledH
  if (safeW >= safeH) {
    scaledW = safeMax
    scaledH = Math.round((safeH / safeW) * safeMax)
  } else {
    scaledH = safeMax
    scaledW = Math.round((safeW / safeH) * safeMax)
  }

  return {
    width: clampToStep(scaledW, step, min),
    height: clampToStep(scaledH, step, min),
  }
}

/**
 * Build a ComfyUI workflow matching the Krita AI Diffusion live-painting
 * pipeline, including ControlNet scribble guidance.
 *
 * Signal flow:
 *
 *   Sketch ──→ LoadImage ──→ ImageScale ──┬──→ VAEEncode ──→ latent (sampler input)
 *                                         │
 *                                         └──→ ImageInvert ──→ ControlNetApplyAdvanced
 *                                                                  ↓
 *   CLIP(prompt)   → positive ──→ ControlNetApplyAdvanced ──→ modified positive ──┐
 *   CLIP(negative) → negative ──→ ControlNetApplyAdvanced ──→ modified negative ──┤
 *                                                                                 ↓
 *                                              CFGGuider(model, pos, neg, cfg) ──→ guider
 *                                                                                 ↓
 *   BasicScheduler → SplitSigmas → sigmas ──→ SamplerCustomAdvanced ──→ VAEDecode ──→ output
 */
export function buildWorkflow(state, imageName) {
  const width = clampDimension(state.width, 256, 500)
  const height = clampDimension(state.height, 256, 500)
  const liveScale = clampToStep(Number(state.liveScale) || 800, 64, 256)
  const scaledSize = scaledSizePreservingAspect(width, height, liveScale)
  const steps = Number(state.steps) || 8
  const cfg = Number(state.cfg) || 4
  const strength = Math.min(1, Math.max(0.01, Number(state.strength) || 0.4))
  const seed = Number(state.seed) || 0
  const sampler = state.sampler || 'euler'
  const scheduler = state.scheduler || 'sgm_uniform'
  const useEasyCache = !state.kritaMode
  const loraName = String(state.loraName || '').trim()
  const useLora = !!loraName

  // ControlNet params
  const cnModel = state.controlNetModel || ''
  const cnStrength = clamp(Number(state.controlNetStrength ?? 0.7), 0.01, 2)
  const cnStart = clamp(Number(state.controlNetStart ?? 0), 0, 1)
  const cnEnd = clamp(Number(state.controlNetEnd ?? 1), 0, 1)
  const cnPreprocess = state.controlNetPreprocess || 'none'
  const cnCannyLow = Math.round(clamp(Number(state.controlNetCannyLow ?? 80), 1, 255))
  const cnCannyHigh = Math.round(clamp(Number(state.controlNetCannyHigh ?? 180), 1, 255))
  const useControlNet = !!(cnModel && imageName)

  // Krita formula: skip early high-noise steps so the sketch is preserved.
  const startAtStep = Math.round(steps * (1 - strength))

  const workflow = {
    // ── Model loading ───────────────────────────────────────────────
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: {
        ckpt_name: state.model,
      },
    },
  }

  let modelSource = ['1', 0]
  if (useEasyCache) {
    workflow['2'] = {
      class_type: 'EasyCache',
      inputs: {
        model: ['1', 0],
        reuse_threshold: 0.2,
        start_percent: 0.15,
        end_percent: 0.95,
        verbose: false,
      },
    }
    modelSource = ['2', 0]
  }

  let clipSource = ['1', 1]
  if (useLora) {
    workflow['3'] = {
      class_type: 'LoraLoader',
      inputs: {
        model: modelSource,
        clip: ['1', 1],
        lora_name: loraName,
        strength_model: Number(state.loraStrengthModel ?? 1),
        strength_clip: Number(state.loraStrengthClip ?? 1),
      },
    }
    modelSource = ['3', 0]
    clipSource = ['3', 1]
  }

  // ── Prompt conditioning (raw — may be modified by ControlNet) ──
  workflow['7'] = {
    class_type: 'CLIPTextEncode',
    inputs: {
      clip: clipSource,
      text: state.prompt || '',
    },
  }
  workflow['8'] = {
    class_type: 'CLIPTextEncode',
    inputs: {
      clip: clipSource,
      text: state.negativePrompt || '',
    },
  }

  // ── Scheduler — always denoise 1.0, strength handled by SplitSigmas
  workflow['10'] = {
    class_type: 'BasicScheduler',
    inputs: {
      model: modelSource,
      scheduler,
      steps,
      denoise: 1.0,
    },
  }

  // ── Noise & sampler selection ───────────────────────────────────
  workflow['12'] = {
    class_type: 'RandomNoise',
    inputs: {
      noise_seed: seed,
    },
  }
  workflow['13'] = {
    class_type: 'KSamplerSelect',
    inputs: {
      sampler_name: sampler,
    },
  }

  // ── Sigmas: split only for img2img ────────────────────────────────
  let sigmasSource
  if (imageName && startAtStep > 0) {
    workflow['11'] = {
      class_type: 'SplitSigmas',
      inputs: {
        sigmas: ['10', 0],
        step: startAtStep,
      },
    }
    sigmasSource = ['11', 1]
  } else {
    sigmasSource = ['10', 0]
  }

  // ── Image / latent source ─────────────────────────────────────────
  let latentSource
  if (imageName) {
    workflow['4'] = {
      class_type: 'LoadImage',
      inputs: {
        image: imageName,
      },
    }
    workflow['5'] = {
      class_type: 'ImageScale',
      inputs: {
        image: ['4', 0],
        width: scaledSize.width,
        height: scaledSize.height,
        upscale_method: 'lanczos',
        crop: 'disabled',
      },
    }
    workflow['6'] = {
      class_type: 'VAEEncode',
      inputs: {
        vae: ['1', 2],
        pixels: ['5', 0],
      },
    }
    latentSource = ['6', 0]
  } else {
    workflow['4'] = {
      class_type: 'EmptyLatentImage',
      inputs: {
        width,
        height,
        batch_size: 1,
      },
    }
    latentSource = ['4', 0]
  }

  // ── ControlNet (scribble) — the key to structural guidance ────────
  // Krita's approach: invert the canvas (white lines on black) and feed
  // it to ControlNetApplyAdvanced which modifies the prompt conditioning
  // to include "follow these lines as structure."
  let positiveSource = ['7', 0]   // raw CLIP positive
  let negativeSource = ['8', 0]   // raw CLIP negative

  if (useControlNet) {
    // Load the ControlNet model
    workflow['18'] = {
      class_type: 'ControlNetLoader',
      inputs: {
        control_net_name: cnModel,
      },
    }
    // Invert the sketch: black lines on white → white lines on black
    // (scribble ControlNets expect white strokes on black background)
    workflow['19'] = {
      class_type: 'ImageInvert',
      inputs: {
        image: ['5', 0],   // use the scaled image
      },
    }
    let controlImageSource = ['19', 0]
    if (cnPreprocess === 'canny') {
      workflow['21'] = {
        class_type: 'Canny',
        inputs: {
          image: ['19', 0],
          low_threshold: cnCannyLow,
          high_threshold: cnCannyHigh,
        },
      }
      controlImageSource = ['21', 0]
    }
    // Apply ControlNet — modifies positive and negative conditioning
    // so the sampler knows to follow the sketch structure
    workflow['20'] = {
      class_type: 'ControlNetApplyAdvanced',
      inputs: {
        positive: ['7', 0],
        negative: ['8', 0],
        control_net: ['18', 0],
        image: controlImageSource,
        strength: cnStrength,
        start_percent: cnStart,
        end_percent: cnEnd,
        vae: ['1', 2],
      },
    }
    // Route the modified conditioning to the guider
    positiveSource = ['20', 0]
    negativeSource = ['20', 1]
  }

  // ── CFGGuider — uses ControlNet-modified conditioning when active ──
  workflow['9'] = {
    class_type: 'CFGGuider',
    inputs: {
      model: modelSource,
      positive: positiveSource,
      negative: negativeSource,
      cfg,
    },
  }

  // ── Sampling ──────────────────────────────────────────────────────
  workflow['14'] = {
    class_type: 'SamplerCustomAdvanced',
    inputs: {
      noise: ['12', 0],
      guider: ['9', 0],
      sampler: ['13', 0],
      sigmas: sigmasSource,
      latent_image: latentSource,
    },
  }

  // ── Decode & output ───────────────────────────────────────────────
  workflow['15'] = {
    class_type: 'VAEDecode',
    inputs: {
      vae: ['1', 2],
      samples: ['14', 1],
    },
  }

  workflow['16'] = {
    class_type: 'ImageScale',
    inputs: {
      image: ['15', 0],
      width,
      height,
      upscale_method: 'lanczos',
      crop: 'disabled',
    },
  }

  workflow['17'] = {
    class_type: 'ETN_SendImageWebSocket',
    inputs: {
      images: ['16', 0],
      format: 'PNG',
    },
  }

  return workflow
}
