import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Toujours `false` au premier rendu (serveur ET premier rendu client lors de
  // l'hydratation) — le serveur ne connaît pas la largeur d'écran réelle. La vraie valeur
  // n'est appliquée qu'après le montage, sinon : erreur d'hydratation React sur mobile.
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    Promise.resolve().then(onChange)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
