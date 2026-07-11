import { useId, type CSSProperties } from 'react'

export default function LoadingComponent({ size = 0.42 }: { size?: number }) {
  const maskId = `loading-mask-${useId().replace(/:/g, '')}`
  return <div className="task-loader" style={{ '--loader-size': size } as CSSProperties}>
    <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden="true">
      <defs><mask id={maskId}>
        <polygon points="0,0 100,0 100,100 0,100" fill="black" />
        <polygon points="25,25 75,25 50,75" fill="white" />
        <polygon points="50,25 75,75 25,75" fill="white" />
        <polygon points="35,35 65,35 50,65" fill="white" />
      </mask></defs>
      <rect width="100" height="100" className="task-loader__shape" mask={`url(#${maskId})`} />
    </svg>
  </div>
}
