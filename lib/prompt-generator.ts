import { encode } from '@toon-format/toon'

export interface PromptData {
  subject: string
  action: string
  location: string
  cameraMovement: string
  cameraAngle: string
  lighting: string
  atmosphere: string
  visualStyle: string
}

export function generateMarkdown(data: PromptData): string {
  const sections: string[] = []

  sections.push('# Video Prompt\n')

  if (data.subject || data.action || data.location) {
    sections.push('## Scene')
    if (data.subject) sections.push(`- **Subject:** ${data.subject}`)
    if (data.action) sections.push(`- **Action:** ${data.action}`)
    if (data.location) sections.push(`- **Location:** ${data.location}`)
    sections.push('')
  }

  if (data.cameraMovement || data.cameraAngle || data.lighting) {
    sections.push('## Cinematics')
    if (data.cameraMovement) sections.push(`- **Camera Movement:** ${data.cameraMovement}`)
    if (data.cameraAngle) sections.push(`- **Camera Angle:** ${data.cameraAngle}`)
    if (data.lighting) sections.push(`- **Lighting:** ${data.lighting}`)
    sections.push('')
  }

  if (data.visualStyle) {
    sections.push('## Style')
    sections.push(`- **Visual Style:** ${data.visualStyle}`)
    sections.push('')
  }

  if (data.atmosphere) {
    sections.push('## Audio')
    sections.push(`- **Atmosphere:** ${data.atmosphere}`)
  }

  return sections.join('\n').trim()
}

export function generateTOON(data: PromptData): string {
  const obj: Record<string, unknown> = {}

  if (data.subject || data.action || data.location) {
    obj.context = {
      ...(data.subject && { subject: data.subject }),
      ...(data.action && { action: data.action }),
      ...(data.location && { location: data.location }),
    }
  }

  if (data.cameraMovement || data.cameraAngle || data.lighting) {
    obj.cinematics = {
      ...(data.cameraMovement && { movement: data.cameraMovement }),
      ...(data.cameraAngle && { angle: data.cameraAngle }),
      ...(data.lighting && { lighting: data.lighting }),
    }
  }

  if (data.visualStyle) {
    obj.style = data.visualStyle
  }

  if (data.atmosphere) {
    obj.audio = { atmosphere: data.atmosphere }
  }

  return encode(obj)
}

export function generateJSON(data: PromptData): string {
  const output: Record<string, unknown> = {}

  if (data.subject || data.action || data.location) {
    output.scene = {
      ...(data.subject && { subject: data.subject }),
      ...(data.action && { action: data.action }),
      ...(data.location && { location: data.location }),
    }
  }

  if (data.cameraMovement || data.cameraAngle || data.lighting) {
    output.cinematics = {
      ...(data.cameraMovement && { movement: data.cameraMovement }),
      ...(data.cameraAngle && { angle: data.cameraAngle }),
      ...(data.lighting && { lighting: data.lighting }),
    }
  }

  if (data.visualStyle) {
    output.style = data.visualStyle
  }

  if (data.atmosphere) {
    output.audio = { atmosphere: data.atmosphere }
  }

  return JSON.stringify(output, null, 2)
}

export function generatePrompt(
  data: PromptData,
  format: 'markdown' | 'toon' | 'json'
): string {
  switch (format) {
    case 'markdown':
      return generateMarkdown(data)
    case 'toon':
      return generateTOON(data)
    case 'json':
      return generateJSON(data)
    default:
      return generateMarkdown(data)
  }
}
