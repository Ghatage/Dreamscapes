function clampToStep(value, step, minValue) {
  if (!Number.isFinite(value)) return minValue
  return Math.max(minValue, Math.round(value / step) * step)
}

function randomSeed() {
  return Math.floor(Math.random() * 1_000_000_000)
}

export function buildWorkflow(state, imageName) {
  const width = clampToStep(Number(state.width) || 512, 64, 256)
  const height = clampToStep(Number(state.height) || 512, 64, 256)
  const liveScale = clampToStep(Number(state.liveScale) || 800, 64, 256)
  const steps = Number(state.steps) || 8
  const cfg = Number(state.cfg) || 4
  const strength = Number(state.strength)
  const denoise = Number.isFinite(strength) && strength > 0 ? strength : Number(state.denoise) || 1
  const seed = state.seed === '' ? randomSeed() : Number(state.seed) || randomSeed()
  const sampler = state.sampler || 'euler'
  const scheduler = state.scheduler || 'sgm_uniform'

  const workflow = {
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: {
        ckpt_name: state.model,
      },
    },
    '2': {
      class_type: 'EasyCache',
      inputs: {
        model: ['1', 0],
        reuse_threshold: 0.2,
        start_percent: 0.15,
        end_percent: 0.95,
        verbose: false,
      },
    },
    '3': {
      class_type: 'LoraLoader',
      inputs: {
        model: ['2', 0],
        clip: ['1', 1],
        lora_name: state.loraName || 'Hyper-SDXL-8steps-CFG-lora.safetensors',
        strength_model: Number(state.loraStrengthModel ?? 1),
        strength_clip: Number(state.loraStrengthClip ?? 1),
      },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: {
        clip: ['3', 1],
        text: state.prompt || '',
      },
    },
    '8': {
      class_type: 'CLIPTextEncode',
      inputs: {
        clip: ['3', 1],
        text: state.negativePrompt || '',
      },
    },
    '9': {
      class_type: 'CFGGuider',
      inputs: {
        model: ['3', 0],
        positive: ['7', 0],
        negative: ['8', 0],
        cfg,
      },
    },
    '10': {
      class_type: 'BasicScheduler',
      inputs: {
        model: ['3', 0],
        scheduler,
        steps,
        denoise,
      },
    },
    '11': {
      class_type: 'SplitSigmas',
      inputs: {
        sigmas: ['10', 0],
        step: 3,
      },
    },
    '12': {
      class_type: 'RandomNoise',
      inputs: {
        noise_seed: seed,
      },
    },
    '13': {
      class_type: 'KSamplerSelect',
      inputs: {
        sampler_name: sampler,
      },
    },
  }

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
        width: liveScale,
        height: liveScale,
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
  } else {
    workflow['4'] = {
      class_type: 'EmptyLatentImage',
      inputs: {
        width,
        height,
        batch_size: 1,
      },
    }
    workflow['6'] = {
      class_type: 'VAEEncode',
      inputs: {
        vae: ['1', 2],
        pixels: ['4', 0],
      },
    }
  }

  workflow['14'] = {
    class_type: 'SamplerCustomAdvanced',
    inputs: {
      noise: ['12', 0],
      guider: ['9', 0],
      sampler: ['13', 0],
      sigmas: ['11', 1],
      latent_image: ['6', 0],
    },
  }

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
