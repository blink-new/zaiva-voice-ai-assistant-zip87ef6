import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/utils'

interface AudioWaveformProps {
  isActive: boolean
  audioLevel?: number
  className?: string
}

export function AudioWaveform({ isActive, audioLevel = 0, className }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const [bars] = useState(() => Array.from({ length: 20 }, () => Math.random()))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      const barWidth = width / bars.length
      const maxBarHeight = height * 0.8

      bars.forEach((bar, index) => {
        const x = index * barWidth
        let barHeight = maxBarHeight * bar * 0.3 // Base height

        if (isActive) {
          // Add audio level influence
          barHeight += maxBarHeight * audioLevel * 0.7
          // Add some randomness for animation
          barHeight += Math.sin(Date.now() * 0.01 + index) * maxBarHeight * 0.2
        }

        barHeight = Math.max(2, Math.min(barHeight, maxBarHeight))

        const y = (height - barHeight) / 2

        // Gradient effect
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight)
        if (isActive) {
          gradient.addColorStop(0, 'hsl(248, 84%, 67%)')
          gradient.addColorStop(1, 'hsl(45, 93%, 47%)')
        } else {
          gradient.addColorStop(0, 'hsl(240, 3.7%, 15.9%)')
          gradient.addColorStop(1, 'hsl(240, 5%, 64.9%)')
        }

        ctx.fillStyle = gradient
        ctx.fillRect(x + 1, y, barWidth - 2, barHeight)
      })

      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(draw)
      }
    }

    draw()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isActive, audioLevel, bars])

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={40}
      className={cn('rounded', className)}
    />
  )
}