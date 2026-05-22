/**
 * Google AdSense 广告位组件
 *
 * 使用前需替换以下两处：
 *   1. index.html 中的 AdSense script 标签里的 publisher ID
 *   2. 调用 <AdSlot> 时传入对应的 slot 属性（后台 → 广告单元 → 广告单元代码）
 *
 * 若 window.adsbygoogle 未加载（用户安装了广告拦截器），组件静默降级。
 */
import { useEffect, useRef } from 'react'

interface AdSlotProps {
  /** AdSense 广告单元 ID，例如 "1234567890" */
  slot: string
  /** 广告格式，默认 auto */
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical'
  className?: string
  style?: React.CSSProperties
}

declare global {
  interface Window { adsbygoogle: object[] }
}

export function AdSlot({ slot, format = 'auto', className, style }: AdSlotProps) {
  const insRef = useRef<HTMLElement>(null)
  const pushed = useRef(false)

  useEffect(() => {
    if (pushed.current || !insRef.current) return
    pushed.current = true
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // 广告拦截器存在时静默忽略
    }
  }, [])

  return (
    <div className={`lb-ad-slot${className ? ` ${className}` : ''}`} style={style}>
      {/* TODO: 将 data-ad-client 替换为你的 AdSense 发布商 ID，格式：ca-pub-XXXXXXXXXXXXXXXX */}
      <ins
        ref={insRef as React.RefObject<HTMLModElement>}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
