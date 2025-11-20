'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">Oops!</h1>
        <p className="text-xl text-muted-foreground mb-2">Algo deu errado</p>
        <p className="text-sm text-muted-foreground mb-6">{error.message}</p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
