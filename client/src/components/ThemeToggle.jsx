import { useEffect, useState } from "react"

export default function ThemeToggle() {
  const [dark, setDark] = useState(
    () => localStorage.getItem("theme") === "dark"
  )

  useEffect(() => {
    const root = window.document.documentElement
    if (dark) {
      root.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      root.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }, [dark])

  return (
    <button
      onClick={() => setDark(!dark)}
      className="fixed top-4 right-4 bg-gray-200 dark:bg-gray-700 text-black dark:text-white px-3 py-1 rounded shadow-md transition"
    >
      {dark ? "☀️ Claro" : "🌙 Oscuro"}
    </button>
  )
}
